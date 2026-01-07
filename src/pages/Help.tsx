import { motion } from "framer-motion";
import { 
  MessageCircle, 
  Mail, 
  FileText, 
  ChevronRight,
  HelpCircle
} from "lucide-react";

const helpItems = [
  {
    icon: FileText,
    title: "FAQ",
    description: "Frequently asked questions",
    action: "View FAQs",
  },
  {
    icon: MessageCircle,
    title: "Live Chat",
    description: "Chat with our support team",
    action: "Start chat",
  },
  {
    icon: Mail,
    title: "Email Support",
    description: "support@flowfitness.app",
    action: "Send email",
  },
];

const faqItems = [
  {
    question: "How do I start a workout?",
    answer: "Go to the Train tab, select a workout template, and tap 'Start Workout' to begin tracking.",
  },
  {
    question: "How do I track my progress?",
    answer: "Visit the Progress tab to view your workout history, personal records, and training streaks.",
  },
  {
    question: "Can I create custom exercises?",
    answer: "Yes! Go to the Exercises tab and tap the + button to create a custom exercise.",
  },
  {
    question: "How do I connect with a coach?",
    answer: "Use the hamburger menu to access 'Find a Coach' and browse available coaches.",
  },
];

export default function Help() {
  return (
    <div className="min-h-screen pt-safe px-4 pb-24">
      {/* Header */}
      <header className="pt-6 pb-4">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight"
        >
          Help & Support
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-muted-foreground text-sm mt-1"
        >
          We're here to help
        </motion.p>
      </header>

      {/* Contact Options */}
      <div className="mt-4 space-y-3">
        {helpItems.map((item, idx) => (
          <motion.button
            key={item.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.05 }}
            className="w-full flex items-center gap-4 bg-card rounded-xl p-4 shadow-card border border-border/50 text-left"
          >
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <item.icon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </motion.button>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="mt-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex items-center gap-2 mb-4"
        >
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Frequently Asked Questions</h2>
        </motion.div>

        <div className="space-y-3">
          {faqItems.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.05 }}
              className="bg-card rounded-xl p-4 shadow-card border border-border/50"
            >
              <p className="font-medium mb-2">{faq.question}</p>
              <p className="text-sm text-muted-foreground">{faq.answer}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* App Info */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center text-sm text-muted-foreground"
      >
        <p>Flow Fitness v1.0.0</p>
        <p className="mt-1">© 2024 Flow Fitness. All rights reserved.</p>
      </motion.div>
    </div>
  );
}
