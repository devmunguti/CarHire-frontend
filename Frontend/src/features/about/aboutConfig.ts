export type Testimonial = { id: string; quote: string; avatar: string; company: string; name: string }
export const testimonials: Testimonial[] = []

export const rentalQuestions = [
  {
    question: 'about.faq.question1',
    answer: 'about.faq.answer1',
  },
  {
    question: 'about.faq.question2',
    answer: 'about.faq.answer2',
  },
  {
    question: 'about.faq.question3',
    answer: 'about.faq.answer3',
  },
  {
    question: 'about.faq.question4',
    answer: 'about.faq.answer4',
  },
  {
    question: 'about.faq.question5',
    answer: 'about.faq.answer5',
  },
] as const
