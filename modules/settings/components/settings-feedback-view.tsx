"use client";

import { FeedbackForm } from "@/modules/feedback/components/feedback-form";
import {
  FEEDBACK_FOOTER,
  FEEDBACK_PAGE_SUBTITLE,
  FEEDBACK_PAGE_TITLE,
} from "@/modules/feedback/constants";
import { BackLink } from "@/shared/components/ui/back-link";

export function SettingsFeedbackView() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <BackLink
        href="/dashboard"
        className="mb-3 text-[12.5px] text-mute hover:text-ink"
      >
        Volver
      </BackLink>

      <header className="mb-5 md:mb-6">
        <h1 className="font-serif text-[23px] font-medium text-ink md:text-[27px]">
          {FEEDBACK_PAGE_TITLE}
        </h1>
        <p className="mt-1 max-w-xl text-[12.5px] text-mute-subtle md:text-[13.5px]">
          {FEEDBACK_PAGE_SUBTITLE}
        </p>
      </header>

      <section className="max-w-xl rounded-[14px] border border-line bg-card p-5 md:p-6">
        <FeedbackForm />
      </section>

      <p className="mt-4 max-w-xl text-[12.5px] text-mute-subtle">
        {FEEDBACK_FOOTER}
      </p>
    </div>
  );
}
