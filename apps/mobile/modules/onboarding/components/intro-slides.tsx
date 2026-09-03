import type { EnvelopeKey } from "@/shared/lib/onboarding/types";

export type SegmentColor = EnvelopeKey;

export type IntroSlideRule = {
  left: string;
  right: string;
  tone?: "positive";
};

export type IntroSlideDailyCard = {
  label: string;
  amount: string;
  cents: string;
  progress: {
    from: { value: string };
    current: { value: string; highlight: string };
    to: { value: string };
    percent: number;
  };
};

export type IntroSlide = {
  eyebrow: string;
  title: string;
  body?: string;
  quote?: string;
  segmentBar?: boolean;
  segments?: {
    label: string;
    pct: string;
    color: SegmentColor;
    description?: string;
  }[];
  segmentNote?: string;
  dailyCard?: IntroSlideDailyCard;
  rules?: IntroSlideRule[];
  cta: string;
  ctaAction: "next" | "sign-up";
  signInLink?: boolean;
  skipLink?: boolean;
  showLogo?: boolean;
};

export const INTRO_SLIDES: IntroSlide[] = [
  {
    eyebrow: "QUIPU",
    title: "Divide tu dinero antes de gastarlo, no después.",
    body: "No es una app de cuentas ni un banco. Es un sistema para responder una sola pregunta, todos los días.",
    quote: "¿Cuánto puedo gastar hoy sin arruinar mi mes?",
    cta: "Cómo funciona",
    ctaAction: "next",
    signInLink: true,
    showLogo: true,
  },
  {
    eyebrow: "LOS TRES SOBRES",
    title: "Todo lo que entra se reparte apenas llega.",
    segmentBar: true,
    segments: [
      {
        label: "Necesidades",
        pct: "50%",
        color: "needs",
        description:
          "Alquiler, comida, transporte y servicios. Lo que sostiene el mes.",
      },
      {
        label: "Gustos",
        pct: "30%",
        color: "wants",
        description:
          "Salir, pedir, compartir algo. Sin culpa: ya está presupuestado.",
      },
      {
        label: "Ahorro",
        pct: "20%",
        color: "savings",
        description:
          "Se aparta primero, no con lo que sobra. Fondo de emergencia y metas.",
      },
    ],
    segmentNote: "Los porcentajes son tuyos: puedes cambiarlos cuando quieras.",
    cta: "Siguiente",
    ctaAction: "next",
    skipLink: true,
  },
  {
    eyebrow: "CICLOS Y DISPONIBLE DIARIO",
    title: "Cada día, un número. Ese es todo el trabajo.",
    body: "Quipu resta tus compromisos y tu ahorro, divide lo que queda entre los días del ciclo y te dice cuánto puedes gastar hoy.",
    dailyCard: {
      label: "PUEDES GASTAR HOY",
      amount: "42",
      cents: ".30",
      progress: {
        from: { value: "DÍA 1" },
        current: { value: "HOY · 15", highlight: "15" },
        to: { value: "DÍA 30" },
        percent: 50,
      },
    },
    rules: [
      { left: "Si un día gastas de más", right: "mañana baja" },
      { left: "Si gastas de menos", right: "mañana sube" },
      { left: "Tu ahorro", right: "no se toca", tone: "positive" },
    ],
    cta: "Empezar",
    ctaAction: "sign-up",
    skipLink: true,
  },
];
