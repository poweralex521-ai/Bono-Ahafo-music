const mongoose = require('mongoose');

const defaultSiteContent = {
  socials: {
    facebook: '',
    instagram: '',
    youtube: '',
    tiktok: '',
  },
  appLinks: {
    googlePlay: '',
    appleAppStore: '',
  },
  footer: {
    tagline: 'Celebrating the people and sounds of Bono, Ghana.',
    contactUrl: '/contact.html',
    poweredBy: 'OTWOTECH',
    poweredByUrl: '',
  },
  about: {
    heroEyebrow: 'THE ASSOCIATION',
    heroTitle: 'A stronger stage for every voice.',
    heroDescription: 'BOMA brings Bono’s music community together—supporting our members, celebrating our culture and connecting exceptional talent with the people who need it.',
    purposeTitle: 'Connected by music. Rooted in Bono.',
    introduction: 'Bono Musicians Association exists to strengthen the professional community of musicians and entertainment practitioners in the Bono Region. The platform helps verified members present their work and receive event enquiries.',
    membershipNote: 'Membership administration is restricted to authorized association administrators and group coordinators. Public directory profiles appear only after association approval.',
  },
  directors: [],
  sponsors: [],
  gallery: [],
};

const siteContentSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'public' },
    content: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, versionKey: false }
);

module.exports = {
  SiteContent: mongoose.model('SiteContent', siteContentSchema),
  defaultSiteContent,
};
