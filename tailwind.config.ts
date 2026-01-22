import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        message: {
          sent: "hsl(var(--message-sent))",
          "sent-foreground": "hsl(var(--message-sent-foreground))",
          received: "hsl(var(--message-received))",
          "received-foreground": "hsl(var(--message-received-foreground))",
        },
        status: {
          online: "hsl(var(--online))",
          offline: "hsl(var(--offline))",
          away: "hsl(var(--away))",
        },
        mask: {
          business: "hsl(var(--mask-business))",
          personal: "hsl(var(--mask-personal))",
          family: "hsl(var(--mask-family))",
          incognito: "hsl(var(--mask-incognito))",
          current: "hsl(var(--mask-current))",
        },
        privacy: {
          open: "hsl(var(--privacy-open))",
          private: "hsl(var(--privacy-private))",
          secure: "hsl(var(--privacy-secure))",
        },
        surface: {
          elevated: "hsl(var(--surface-elevated))",
          overlay: "hsl(var(--surface-overlay))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      fontSize: {
        // Optimized for readability - 16-17pt base
        "message": ["1.0625rem", { lineHeight: "1.5", letterSpacing: "-0.01em" }],
        "message-sm": ["0.9375rem", { lineHeight: "1.45" }],
      },
      spacing: {
        // 8pt grid system
        "0.5": "0.125rem",
        "1": "0.25rem",
        "1.5": "0.375rem",
        "2": "0.5rem",
        "2.5": "0.625rem",
        "3": "0.75rem",
        "3.5": "0.875rem",
        "4": "1rem",
        "5": "1.25rem",
        "6": "1.5rem",
        "7": "1.75rem",
        "8": "2rem",
        "9": "2.25rem",
        "10": "2.5rem",
        "11": "2.75rem",
        "12": "3rem",
        "14": "3.5rem",
        "16": "4rem",
        "18": "4.5rem",
        "20": "5rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          from: { opacity: "1", transform: "translateY(0)" },
          to: { opacity: "0", transform: "translateY(8px)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "scale-bounce": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "50%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "typing": {
          "0%, 60%, 100%": { transform: "translateY(0)" },
          "30%": { transform: "translateY(-4px)" },
        },
        "mask-wash": {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "50%": { opacity: "0.3" },
          "100%": { opacity: "0", transform: "scale(2)" },
        },
        "spring": {
          "0%": { transform: "scale(0.95) translateY(10px)", opacity: "0" },
          "60%": { transform: "scale(1.02) translateY(-2px)" },
          "100%": { transform: "scale(1) translateY(0)", opacity: "1" },
        },
        "send-message": {
          "0%": { opacity: "0.7", transform: "translateX(10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        // Premium luxury animations
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(212, 175, 55, 0.15)" },
          "50%": { boxShadow: "0 0 40px rgba(212, 175, 55, 0.25)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "subtle-bounce": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)" },
        },
        "reveal": {
          "0%": { opacity: "0", transform: "translateY(20px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "slide-up-fade": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "elegant-in": {
          "0%": { opacity: "0", transform: "scale(0.96) translateY(8px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "ripple": {
          "0%": { transform: "scale(0)", opacity: "0.5" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.25s ease-out",
        "fade-out": "fade-out 0.25s ease-out",
        "slide-in-right": "slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-left": "slide-in-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scale-in 0.2s ease-out",
        "scale-bounce": "scale-bounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "typing": "typing 1.4s ease-in-out infinite",
        "mask-wash": "mask-wash 0.6s ease-out forwards",
        "spring": "spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "send-message": "send-message 0.3s ease-out",
        // Premium animations
        "shimmer": "shimmer 2.5s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "subtle-bounce": "subtle-bounce 0.4s ease-out",
        "reveal": "reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up-fade": "slide-up-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "elegant-in": "elegant-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "ripple": "ripple 0.6s ease-out forwards",
      },
      transitionTimingFunction: {
        "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "smooth": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
