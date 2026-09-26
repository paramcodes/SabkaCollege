export const landingContent = {
  hero: {
    eyebrow: "SabkaCollege Editorial Academy",
    title: "Learn with SabkaCollege.",
    description:
      "Practical, self-paced courses for curious people who want clear thinking, useful skills, and work they are proud to put their name to.",
    primaryAction: "Explore courses",
    secondaryAction: "See how it works",
  },
  outcomes: {
    eyebrow: "What you will gain",
    title: "Leave with work you can use.",
    description:
      "Every course is shaped around a useful outcome—not a content quota. Learn at your pace, revisit the lessons, and keep access when you need it.",
    items: [
      {
        number: "01",
        title: "A practical skill",
        description:
          "Build a repeatable method you can apply to a real project, workplace task, or everyday problem.",
      },
      {
        number: "02",
        title: "A sharper point of view",
        description:
          "Understand the principles behind the work so you can adapt instead of copying a fixed recipe.",
      },
      {
        number: "03",
        title: "A finished outcome",
        description:
          "Complete a focused exercise that gives your learning a visible endpoint and a result to share.",
      },
    ],
  },
  featuredCourses: {
    eyebrow: "The current shelf",
    title: "Start with a question worth pursuing.",
    description:
      "Browse the public catalogue for course overviews, syllabi, and selected preview lessons.",
  },
  howItWorks: {
    eyebrow: "How it works",
    title: "A clear path from curious to capable.",
    description:
      "From a public course page to a saved place in your learning journey, each step stays clear and self-paced.",
    items: [
      {
        number: "01",
        title: "Choose your course",
        description:
          "Read the course overview and syllabus. Preview selected lessons before you decide.",
      },
      {
        number: "02",
        title: "Purchase once",
        description:
          "Sign in and make a one-time payment. There is no subscription to remember or renew.",
      },
      {
        number: "03",
        title: "Learn at your pace",
        description:
          "Move through focused lessons, pause when you need to, and return whenever you are ready.",
      },
      {
        number: "04",
        title: "Track your progress",
        description:
          "Your learning area keeps your place and records completed lessons as you go.",
      },
    ],
  },
  preview: {
    eyebrow: "Look before you commit",
    title: "A learning experience made for attention.",
    description:
      "Course material is organised into focused lessons, concise module guides, and preview moments that help you understand the pace before purchasing.",
    points: [
      "Public course overviews and complete syllabus previews",
      "Selected free lessons before you purchase",
      "Progress saved across your lessons and devices",
    ],
  },
  credibility: {
    eyebrow: "The SabkaCollege standard",
    title: "Useful education should earn your trust.",
    description:
      "We keep the promise small and specific: clear courses, transparent pricing, and an MVP focused on the fundamentals of good learning.",
    principles: [
      {
        title: "Editorially focused",
        description:
          "Every course has a point of view, a defined audience, and a sensible order of study.",
      },
      {
        title: "Honestly priced",
        description:
          "Purchase a course once. There are no recurring plans, hidden tiers, or feature gates.",
      },
      {
        title: "Built to be resumed",
        description:
          "Clear modules and saved progress make it practical to learn around a full life.",
      },
    ],
  },
  finalCta: {
    eyebrow: "Your next chapter",
    title: "Bring a question. Leave with a capability.",
    description:
      "Explore the catalogue, preview a lesson, and choose the course that meets you where you are.",
  },
  developmentCourses: [
    {
      slug: "designing-clear-digital-products",
      title: "Designing clear digital products",
      description:
        "Turn an early idea into a focused product brief with a stronger audience, narrative, and hierarchy.",
      duration: "95 min",
      price: "₹4,999",
      category: "Product thinking",
    },
    {
      slug: "writing-with-a-point-of-view",
      title: "Writing with a point of view",
      description:
        "Find the central idea in your thinking, then communicate it with structure, specificity, and confidence.",
      duration: "80 min",
      price: "₹3,999",
      category: "Communication",
    },
  ],
} as const;

export const pricingContent = {
  eyebrow: "Simple pricing",
  title: "Pay once. Keep your course access.",
  description:
    "SabkaCollege sells individual self-paced courses. There are no subscriptions, bundles, or recurring charges.",
  purchaseSteps: [
    {
      number: "01",
      title: "Find your course",
      description: "Read the public overview and syllabus, then watch any selected preview lessons.",
    },
    {
      number: "02",
      title: "Create your account",
      description: "Sign in securely before checkout so your purchase and progress stay connected to you.",
    },
    {
      number: "03",
      title: "Make one payment",
      description: "Pay the one-time course price through Stripe Checkout. Your access begins after confirmed payment.",
    },
  ],
  included: [
    "Lifetime access to the purchased course",
    "All published lessons in that course",
    "Saved lesson progress and playback position",
    "Future course updates at no additional cost",
  ],
  faqs: [
    {
      question: "Is this a subscription?",
      answer:
        "No. Each course is a one-time purchase. You are not enrolled in a recurring plan and will not be charged again for that course.",
    },
    {
      question: "What do I need to buy a course?",
      answer:
        "Create an account or sign in before checkout. The catalogue and preview material stay public, but an account is required to make a purchase and save progress.",
    },
    {
      question: "How long do I have access?",
      answer:
        "Your purchase includes lifetime access to the purchased course while SabkaCollege is operating.",
    },
    {
      question: "Can I try a course first?",
      answer:
        "Yes. Every published course includes a syllabus and selected preview lessons so you can understand the course before you buy.",
    },
    {
      question: "What payment method is accepted?",
      answer:
        "Checkout is handled securely by Stripe. The payment methods available to you are shown during checkout.",
    },
  ],
} as const;
