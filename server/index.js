require('dotenv').config();

const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const express = require('express');
const multer = require('multer');
const { rateLimit } = require('express-rate-limit');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const { z } = require('zod');
const Booking = require('./models/Booking');
const AuditLog = require('./models/AuditLog');
const Counter = require('./models/Counter');
const Invitation = require('./models/Invitation');
const User = require('./models/User');
const { SiteContent, defaultSiteContent } = require('./models/SiteContent');

const app = express();
const port = Number(process.env.PORT) || 3000;
const tokenCookie = 'boma_session';
const dummyPasswordHash = bcrypt.hashSync('not-a-real-password', 12);

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.');
}

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
    },
  },
}));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please try again later.' },
});

const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many booking requests. Please try again later.' },
});

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
});

const bookingSchema = z.object({
  talentId: z.string().regex(/^[a-f\d]{24}$/i),
  organizerName: z.string().trim().min(2).max(120),
  organizerEmail: z.string().email().max(254),
  organizerPhone: z.string().trim().min(7).max(40),
  eventName: z.string().trim().min(2).max(160),
  eventDate: z.coerce.date().refine((date) => date.getTime() > Date.now(), 'Event date must be in the future.'),
  location: z.string().trim().min(2).max(160),
  details: z.string().trim().max(2000).optional(),
});

const invitationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().email().max(254),
  role: z.enum(['member', 'coordinator']).default('member'),
  group: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional(),
  profession: z.string().trim().max(80).optional(),
  location: z.string().trim().max(120).optional(),
});

const acceptInvitationSchema = z.object({
  token: z.string().min(32).max(200),
  password: z.string().min(12).max(200),
});

const profileSchema = z.object({
  profession: z.string().trim().max(80),
  instruments: z.array(z.string().trim().min(1).max(60)).max(20),
  genres: z.array(z.string().trim().min(1).max(60)).max(20),
  location: z.string().trim().max(120),
  phone: z.string().trim().max(40).optional(),
  biography: z.string().trim().max(2000),
  bookingPrice: z.number().min(0).max(10000000).nullable().optional(),
  yearsExperience: z.number().int().min(0).max(100).optional(),
  availability: z.string().trim().max(120).optional(),
  portfolioUrl: z.string().trim().max(1000).url().or(z.literal(''))
    .refine((value) => !value || /^https?:\/\//i.test(value), 'Portfolio URLs must use HTTP or HTTPS.')
    .optional(),
});

const externalUrlSchema = z.string().max(500).url().or(z.literal(''))
  .refine((value) => !value || /^https:\/\//i.test(value), 'Links must use HTTPS.');
const siteImageSchema = z.string().max(120).regex(/^\/site-media\/[a-f\d-]+\.(?:jpg|png|webp)$/i).or(z.literal(''));
const siteContentSchema = z.object({
  socials: z.object({
    facebook: externalUrlSchema,
    instagram: externalUrlSchema,
    youtube: externalUrlSchema,
    tiktok: externalUrlSchema,
  }).strict(),
  appLinks: z.object({
    googlePlay: externalUrlSchema,
    appleAppStore: externalUrlSchema,
  }).strict(),
  footer: z.object({
    tagline: z.string().trim().min(1).max(200),
    contactUrl: z.string().trim().max(500).refine((value) => value.startsWith('/') && !value.startsWith('//')),
    poweredBy: z.string().trim().min(1).max(80),
    poweredByUrl: externalUrlSchema,
  }).strict(),
  about: z.object({
    heroEyebrow: z.string().trim().min(1).max(80),
    heroTitle: z.string().trim().min(1).max(160),
    heroDescription: z.string().trim().min(1).max(800),
    purposeTitle: z.string().trim().min(1).max(160),
    introduction: z.string().trim().min(1).max(3000),
    membershipNote: z.string().trim().max(1500),
  }).strict(),
  directors: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    role: z.string().trim().min(1).max(120),
    biography: z.string().trim().max(1000),
    imageUrl: siteImageSchema,
  }).strict()).max(24),
  sponsors: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    website: externalUrlSchema,
    imageUrl: siteImageSchema,
  }).strict()).max(24),
  gallery: z.array(z.object({
    title: z.string().trim().min(1).max(160),
    caption: z.string().trim().max(500),
    imageUrl: siteImageSchema,
  }).strict()).max(36),
}).strict();

const siteImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(new Error('Upload a JPG, PNG, or WebP image.'));
      return;
    }
    callback(null, true);
  },
});

function isSupportedImage(buffer, mimeType) {
  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  return mimeType === 'image/webp'
    && buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP';
}

function parseSiteImageUpload(req, res, next) {
  siteImageUpload.single('image')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === 'LIMIT_FILE_SIZE';
      return res.status(tooLarge ? 413 : 400).json({
        error: tooLarge ? 'Images must be 6 MB or smaller.' : 'Upload one image at a time.',
      });
    }
    if (error.message === 'Upload a JPG, PNG, or WebP image.') {
      return res.status(400).json({ error: error.message });
    }
    return next(error);
  });
}

function setSessionCookie(res, token) {
  res.cookie(tokenCookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });
}

async function requireAuth(req, res, next) {
  const token = req.cookies[tokenCookie];
  if (!token) {
    return res.status(401).json({ error: 'Sign in is required.' });
  }

  let claims;
  try {
    claims = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'boma-platform',
      audience: 'boma-web',
    });
  } catch {
    res.clearCookie(tokenCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }

  try {
    const user = await User.findById(claims.sub).select('role status coordinatorGroup');
    if (!user || user.status !== 'active') {
      res.clearCookie(tokenCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
      return res.status(401).json({ error: 'This account is unavailable.' });
    }
    req.auth = { sub: user.id, role: user.role, coordinatorGroup: user.coordinatorGroup };
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    return next();
  };
}

app.get('/api/health', (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? 'ok' : 'database_unavailable',
    database: databaseReady ? 'connected' : 'disconnected',
  });
});

app.get('/api/site-content', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    const saved = await SiteContent.findById('public').select('content updatedAt').lean();
    return res.json({ content: saved?.content || defaultSiteContent, updatedAt: saved?.updatedAt || null });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/site-content', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    const saved = await SiteContent.findById('public').select('content updatedAt').lean();
    return res.json({ content: saved?.content || defaultSiteContent, updatedAt: saved?.updatedAt || null });
  } catch (error) {
    return next(error);
  }
});

app.put('/api/admin/site-content', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  try {
    const parsed = siteContentSchema.safeParse(req.body?.content);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Check the website content fields and uploaded image selections.' });
    }
    const current = await SiteContent.findById('public').select('content').lean();
    const saved = await SiteContent.findByIdAndUpdate(
      'public',
      { $set: { content: parsed.data, updatedBy: req.auth.sub } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).select('content updatedAt').lean();
    await AuditLog.create({
      actor: req.auth.sub,
      action: 'site.content_updated',
      target: 'public-site-content',
      details: `Updated website content (${parsed.data.directors.length} directors, ${parsed.data.sponsors.length} sponsors, ${parsed.data.gallery.length} gallery images).`,
    });
    res.set('Cache-Control', 'no-store');
    return res.json({ content: saved.content, updatedAt: saved.updatedAt });
  } catch (error) {
    return next(error);
  }
});

app.post(
  '/api/admin/site-media',
  requireAuth,
  requireRole('super_admin'),
  parseSiteImageUpload,
  async (req, res, next) => {
    try {
      if (!req.file || !isSupportedImage(req.file.buffer, req.file.mimetype)) {
        return res.status(400).json({ error: 'The selected file is not a valid JPG, PNG, or WebP image.' });
      }
      const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
      const filename = `${crypto.randomUUID()}.${extensions[req.file.mimetype]}`;
      const mediaDirectory = path.join(__dirname, '..', 'public', 'site-media');
      await fs.mkdir(mediaDirectory, { recursive: true });
      await fs.writeFile(path.join(mediaDirectory, filename), req.file.buffer, { flag: 'wx' });
      await AuditLog.create({
        actor: req.auth.sub,
        action: 'site.image_uploaded',
        target: filename,
        details: `Uploaded ${req.file.mimetype} image (${req.file.size} bytes).`,
      });
      return res.status(201).json({ imageUrl: `/site-media/${filename}` });
    } catch (error) {
      return next(error);
    }
  }
);

app.post('/api/auth/login', authLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Enter a valid email address and password.' });
    }

    const email = parsed.data.email.toLowerCase();
    const user = await User.findOne({ email }).select('+passwordHash');
    const passwordMatches = await bcrypt.compare(
      parsed.data.password,
      user ? user.passwordHash : dummyPasswordHash
    );

    if (!user || !passwordMatches || user.status !== 'active') {
      return res.status(401).json({ error: 'Email or password is incorrect, or the account is inactive.' });
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h', issuer: 'boma-platform', audience: 'boma-web' }
    );
    setSessionCookie(res, token);
    return res.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        membershipId: user.membershipId,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/auth/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.sub)
      .select('fullName email role status membershipId group coordinatorGroup profilePhotoUrl');
    if (!user || user.status !== 'active') {
      res.clearCookie(tokenCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
      return res.status(401).json({ error: 'This account is unavailable.' });
    }
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(tokenCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  res.sendStatus(204);
});

app.post('/api/invitations', requireAuth, async (req, res, next) => {
  try {
    const parsed = invitationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Provide a name, valid email, and group.' });
    }

    const invitation = parsed.data;
    if (req.auth.role === 'coordinator') {
      if (invitation.role !== 'member') {
        return res.status(403).json({ error: 'Coordinators may only invite members.' });
      }
      invitation.group = req.auth.coordinatorGroup;
    } else if (req.auth.role !== 'super_admin') {
      return res.status(403).json({ error: 'You do not have permission to invite accounts.' });
    }

    if (!invitation.group) {
      return res.status(403).json({ error: 'Your account is not assigned to a group.' });
    }

    const email = invitation.email.toLowerCase();
    if (await User.exists({ email })) {
      return res.status(409).json({ error: 'An account already exists for this email address.' });
    }

    let membershipId;
    if (invitation.role === 'member') {
      const year = new Date().getFullYear();
      const counter = await Counter.findOneAndUpdate(
        { _id: `membership-${year}` },
        { $inc: { value: 1 } },
        { upsert: true, new: true }
      );
      membershipId = `BMA-${year}-${String(counter.value).padStart(3, '0')}`;
    }

    const user = await User.create({
      fullName: invitation.fullName,
      email,
      role: invitation.role,
      status: 'invited',
      membershipId,
      group: invitation.group,
      coordinatorGroup: invitation.role === 'coordinator' ? invitation.group : undefined,
      phone: invitation.phone,
      profession: invitation.profession,
      location: invitation.location,
      profileApprovalStatus: 'not_submitted',
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    await Invitation.create({
      user: user._id,
      email,
      tokenHash: crypto.createHash('sha256').update(rawToken).digest('hex'),
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      createdBy: req.auth.sub,
    });
    await AuditLog.create({
      actor: req.auth.sub,
      action: 'invitation.created',
      target: user.id,
      details: `${invitation.role} invitation for ${email} (${invitation.group})`,
    });

    return res.status(201).json({
      message: 'Invitation created. Share this one-time link with the invited person.',
      invitationUrl: `/invite.html?token=${rawToken}`,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      user: { id: user.id, fullName: user.fullName, email, role: user.role, group: user.group, membershipId },
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/invitations/accept', authLimiter, async (req, res, next) => {
  try {
    const parsed = acceptInvitationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invitation token or password is invalid.' });
    }
    const tokenHash = crypto.createHash('sha256').update(parsed.data.token).digest('hex');
    const invitation = await Invitation.findOne({
      tokenHash,
      acceptedAt: null,
      expiresAt: { $gt: new Date() },
    }).select('+tokenHash');
    if (!invitation) {
      return res.status(400).json({ error: 'This invitation has expired or has already been used.' });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await User.findOneAndUpdate(
      { _id: invitation.user, email: invitation.email, status: 'invited' },
      {
        $set: {
          passwordHash,
          status: 'pending',
          emailVerifiedAt: new Date(),
        },
      },
      { new: true }
    );
    if (!user) {
      return res.status(400).json({ error: 'This invitation is no longer available.' });
    }

    invitation.acceptedAt = new Date();
    await invitation.save();
    await AuditLog.create({
      actor: user._id,
      action: 'invitation.accepted',
      target: user.id,
      details: 'Invite accepted and email verified; awaiting account approval.',
    });
    return res.json({ message: 'Your email is verified. Your account is waiting for association approval.' });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/members', requireAuth, requireRole('super_admin', 'coordinator'), async (req, res, next) => {
  try {
    const filter = { role: 'member' };
    if (req.auth.role === 'coordinator') {
      const coordinator = await User.findById(req.auth.sub).select('coordinatorGroup');
      if (!coordinator?.coordinatorGroup) {
        return res.status(403).json({ error: 'Your account is not assigned to a group.' });
      }
      filter.group = coordinator.coordinatorGroup;
    }
    if (req.query.status && ['invited', 'pending', 'active', 'suspended'].includes(req.query.status)) {
      filter.status = req.query.status;
    }
    const [members, totalCount, statusCounts] = await Promise.all([
      User.find(filter)
        .select('fullName email status membershipId group profession location profileApprovalStatus createdAt')
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
      User.countDocuments(filter),
      User.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);
    return res.json({
      members,
      totalCount,
      statusCounts: Object.fromEntries(statusCounts.map(({ _id, count }) => [_id, count])),
    });
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/admin/members/:id', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  try {
    const updateSchema = z.object({
      status: z.enum(['active', 'suspended']).optional(),
      approveProfile: z.boolean().optional(),
    }).refine((value) => value.status !== undefined || value.approveProfile !== undefined);
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Provide a valid account or profile approval update.' });
    }

    const member = await User.findOne({ _id: req.params.id, role: 'member' });
    if (!member) return res.status(404).json({ error: 'Member not found.' });
    if (parsed.data.status === 'active' && !member.emailVerifiedAt) {
      return res.status(409).json({ error: 'The member must accept their invitation before activation.' });
    }
    if (parsed.data.status) {
      member.status = parsed.data.status;
      member.publicProfileApproved = parsed.data.status === 'active'
        && member.profileApprovalStatus === 'approved';
    }
    if (parsed.data.approveProfile !== undefined) {
      if (parsed.data.approveProfile && !member.emailVerifiedAt) {
        return res.status(409).json({ error: 'Verify the member invitation before approval.' });
      }
      member.profileApprovalStatus = parsed.data.approveProfile ? 'approved' : 'rejected';
      member.publicProfileApproved = parsed.data.approveProfile && member.status === 'active';
    }
    await member.save();
    await AuditLog.create({
      actor: req.auth.sub,
      action: 'member.updated',
      target: member.id,
      details: JSON.stringify(parsed.data),
    });
    return res.json({
      member: {
        id: member.id,
        fullName: member.fullName,
        status: member.status,
        profileApprovalStatus: member.profileApprovalStatus,
        publicProfileApproved: member.publicProfileApproved,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/coordinators', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  try {
    const coordinators = await User.find({ role: 'coordinator' })
      .select('fullName email status coordinatorGroup createdAt')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return res.json({ coordinators });
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/admin/accounts/:id/status', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  try {
    const parsed = z.object({ status: z.enum(['active', 'suspended']) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Choose active or suspended status.' });
    const account = await User.findOne(
      { _id: req.params.id, role: { $in: ['member', 'coordinator'] }, emailVerifiedAt: { $ne: null } },
    ).select('fullName email role status group coordinatorGroup profileApprovalStatus publicProfileApproved');
    if (!account) return res.status(404).json({ error: 'Verified member or coordinator account not found.' });
    account.status = parsed.data.status;
    account.publicProfileApproved = account.role === 'member'
      && account.status === 'active'
      && account.profileApprovalStatus === 'approved';
    await account.save();
    await AuditLog.create({
      actor: req.auth.sub,
      action: 'account.status_changed',
      target: account.id,
      details: `Set ${account.role} status to ${account.status}`,
    });
    return res.json({ account });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/member/profile', requireAuth, requireRole('member'), async (req, res, next) => {
  try {
    const member = await User.findById(req.auth.sub)
      .select('fullName email status membershipId group phone profession instruments genres location biography bookingPrice yearsExperience availability portfolioUrl profilePhotoUrl profileApprovalStatus publicProfileApproved createdAt')
      .lean();
    return res.json({ profile: member });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/member/dashboard', requireAuth, requireRole('member'), async (req, res, next) => {
  try {
    const [member, totalMembers, availableTalent, bookings, featuredTalent] = await Promise.all([
      User.findById(req.auth.sub)
        .select('fullName email status membershipId group phone profession instruments genres location biography bookingPrice yearsExperience availability portfolioUrl profilePhotoUrl profileApprovalStatus publicProfileApproved createdAt')
        .lean(),
      User.countDocuments({ role: 'member', status: 'active' }),
      User.countDocuments({ role: 'member', status: 'active', publicProfileApproved: true }),
      Booking.countDocuments({ talent: req.auth.sub }),
      User.find({
        _id: { $ne: req.auth.sub },
        role: 'member',
        status: 'active',
        publicProfileApproved: true,
      })
        .select('fullName profession location profilePhotoUrl bookingPrice instruments genres yearsExperience availability')
        .sort({ updatedAt: -1 })
        .limit(4)
        .lean(),
    ]);

    if (!member) return res.status(404).json({ error: 'Member profile not found.' });
    const publicBaseUrl = (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
    const verificationUrl = member.membershipId
      ? `${publicBaseUrl}/verify.html?membershipId=${encodeURIComponent(member.membershipId)}`
      : null;
    const verificationQr = verificationUrl
      ? await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 180,
        color: { dark: '#07172f', light: '#ffffff' },
      })
      : null;

    return res.json({
      member,
      statistics: {
        totalMembers,
        availableTalent,
        bookings,
        events: null,
      },
      capabilities: {
        events: false,
        payments: false,
        videos: false,
        notifications: false,
        expiryDate: false,
      },
      membershipCard: {
        verificationUrl,
        verificationQr,
        expiresAt: null,
      },
      featuredTalent,
    });
  } catch (error) {
    return next(error);
  }
});

app.put('/api/member/profile', requireAuth, requireRole('member'), async (req, res, next) => {
  try {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Check the profile fields and try again.' });
    const member = await User.findByIdAndUpdate(
      req.auth.sub,
      {
        $set: {
          ...parsed.data,
          profileApprovalStatus: 'pending',
          publicProfileApproved: false,
        },
      },
      { new: true, runValidators: true }
    ).select('fullName email status membershipId group phone profession instruments genres location biography bookingPrice yearsExperience availability portfolioUrl profileApprovalStatus');
    return res.json({ profile: member, message: 'Profile saved and submitted for association review.' });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/talents', async (req, res, next) => {
  try {
    const { q, profession, location, instrument, genre } = req.query;
    const requestedPage = Number.parseInt(String(req.query.page || '1'), 10);
    const requestedPageSize = Number.parseInt(String(req.query.limit || '60'), 10);
    const pageSize = Number.isSafeInteger(requestedPageSize) && requestedPageSize > 0
      ? Math.min(requestedPageSize, 60)
      : 60;
    const filter = {
      role: 'member',
      status: 'active',
      publicProfileApproved: true,
    };
    if (profession) filter.profession = new RegExp(`^${escapeRegex(String(profession).slice(0, 80))}$`, 'i');
    if (location) filter.location = new RegExp(escapeRegex(String(location).slice(0, 120)), 'i');
    if (instrument) filter.instruments = new RegExp(escapeRegex(String(instrument).slice(0, 60)), 'i');
    if (genre) filter.genres = new RegExp(escapeRegex(String(genre).slice(0, 60)), 'i');
    if (q) {
      const search = escapeRegex(String(q).slice(0, 80));
      filter.$or = [
        { fullName: new RegExp(search, 'i') },
        { profession: new RegExp(search, 'i') },
        { location: new RegExp(search, 'i') },
        { instruments: new RegExp(search, 'i') },
        { genres: new RegExp(search, 'i') },
      ];
    }

    const total = await User.countDocuments(filter);
    const pageCount = Math.ceil(total / pageSize);
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, Math.max(pageCount, 1))
      : 1;
    const talents = await User.find(filter)
      .select('fullName profession instruments location genres biography profilePhotoUrl bookingPrice yearsExperience availability portfolioUrl')
      .sort({ fullName: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();
    return res.json({
      talents,
      pagination: {
        page,
        pageSize,
        total,
        pages: pageCount,
        hasPrevious: page > 1,
        hasNext: page < pageCount,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/talents/:id', async (req, res, next) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(404).json({ error: 'Talent profile not found.' });
    }
    const talent = await User.findOne({
      _id: req.params.id,
      role: 'member',
      status: 'active',
      publicProfileApproved: true,
    })
      .select('fullName profession instruments location genres biography profilePhotoUrl bookingPrice membershipId yearsExperience availability portfolioUrl')
      .lean();
    if (!talent) return res.status(404).json({ error: 'Talent profile not found.' });
    return res.json({ talent });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/verify/:membershipId', async (req, res, next) => {
  try {
    const member = await User.findOne({
      membershipId: req.params.membershipId,
      role: 'member',
      status: 'active',
    })
      .select('fullName membershipId profession')
      .lean();
    if (!member) return res.status(404).json({ verified: false, error: 'Membership could not be verified.' });
    return res.json({
      verified: true,
      member: {
        fullName: member.fullName,
        membershipId: member.membershipId,
        profession: member.profession,
        status: 'Active',
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/member/bookings', requireAuth, requireRole('member'), async (req, res, next) => {
  try {
    const bookings = await Booking.find({ talent: req.auth.sub })
      .select('organizerName organizerEmail organizerPhone eventName eventDate location details status createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.json({ bookings });
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/member/bookings/:id/status', requireAuth, requireRole('member'), async (req, res, next) => {
  try {
    const parsed = z.object({ status: z.enum(['accepted', 'rejected']) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Choose accepted or rejected.' });
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, talent: req.auth.sub, status: 'pending' },
      { $set: { status: parsed.data.status } },
      { new: true, runValidators: true }
    ).select('eventName eventDate location status');
    if (!booking) return res.status(404).json({ error: 'Pending booking request not found.' });
    return res.json({ booking });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/bookings', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  try {
    const filter = {};
    if (['pending', 'accepted', 'rejected', 'cancelled'].includes(req.query.status)) filter.status = req.query.status;
    const bookings = await Booking.find(filter)
      .populate('talent', 'fullName membershipId')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return res.json({ bookings });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/bookings', bookingLimiter, async (req, res, next) => {
  try {
    const parsed = bookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Check the booking details and try again.' });
    }

    const talent = await User.findOne({
      _id: parsed.data.talentId,
      role: 'member',
      status: 'active',
      publicProfileApproved: true,
    }).select('_id');
    if (!talent) {
      return res.status(404).json({ error: 'This talent profile is not available for booking.' });
    }

    await Booking.create({
      talent: talent._id,
      organizerName: parsed.data.organizerName,
      organizerEmail: parsed.data.organizerEmail,
      organizerPhone: parsed.data.organizerPhone,
      eventName: parsed.data.eventName,
      eventDate: parsed.data.eventDate,
      location: parsed.data.location,
      details: parsed.data.details,
    });
    return res.status(201).json({ message: 'Your booking request has been submitted.' });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/admin/summary', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  try {
    const [members, activeMembers, pendingMembers, coordinators, bookings] = await Promise.all([
      User.countDocuments({ role: 'member' }),
      User.countDocuments({ role: 'member', status: 'active' }),
      User.countDocuments({ role: 'member', status: { $in: ['invited', 'pending'] } }),
      User.countDocuments({ role: 'coordinator' }),
      Booking.countDocuments({ status: 'pending' }),
    ]);
    return res.json({ members, activeMembers, pendingMembers, coordinators, pendingBookings: bookings });
  } catch (error) {
    return next(error);
  }
});

app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  return res.status(500).json({ error: 'An unexpected server error occurred.' });
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function start() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required. Copy .env.example to .env and configure MongoDB.');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(port, () => {
    console.log(`BOMA platform is ready at http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error(`Server startup failed: ${error.message}`);
  process.exitCode = 1;
});
