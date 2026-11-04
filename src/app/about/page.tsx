import { site } from '../../lib/content';
import { pageMetadata } from '../../lib/seo';
import { ABOUT_DESCRIPTION, AboutPage } from '../../views/AboutPage';

export const metadata = pageMetadata(site, { title: 'About', description: ABOUT_DESCRIPTION, path: '/about' });

export default AboutPage;
