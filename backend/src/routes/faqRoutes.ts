import { Router } from 'express';
import { getFaqs, getTestimonials } from '../controllers/faqController';

export const faqRouter = Router();
faqRouter.get('/', getFaqs);
faqRouter.get('/faqs', getFaqs);

export const testimonialRouter = Router();
testimonialRouter.get('/', getTestimonials);
testimonialRouter.get('/testimonials', getTestimonials);

const defaultRouter = Router();
defaultRouter.get('/', getFaqs);
defaultRouter.get('/faqs', getFaqs);
defaultRouter.get('/testimonials', getTestimonials);

export default defaultRouter;
