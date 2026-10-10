"use client";

import { useState, type FormEvent } from "react";
import { Mail, Send } from "lucide-react";

const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() ?? "";
const validContactEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail);

export function ContactSection() {
  const [status, setStatus] = useState("");

  function submitContactForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validContactEmail) return;

    const formData = new FormData(event.currentTarget);
    const senderName = String(formData.get("name") ?? "").trim();
    const senderEmail = String(formData.get("email") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    const parameters = new URLSearchParams({
      subject: `ThinkPin message from ${senderName}`,
      body: `From: ${senderName}\nEmail: ${senderEmail}\n\n${message}`,
    });

    window.location.href = `mailto:${contactEmail}?${parameters.toString()}`;
    setStatus(
      "Your email app should open with the message ready to send. If it doesn't, email us directly using the address below.",
    );
  }

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      data-scroll-reveal
      className="bg-surface px-5 py-24 sm:px-8 sm:py-28 lg:py-32"
    >
      <div className="mx-auto grid max-w-container-xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Contact
          </p>
          <h2
            id="contact-title"
            className="mt-4 font-heading text-4xl leading-[1.02] tracking-tight text-text sm:text-5xl"
          >
            We&apos;d like to hear from you.
          </h2>
          <p className="mt-5 text-base leading-7 text-text-muted">
            Questions, feedback, or an idea for ThinkPin? Write us a note and
            we&apos;ll help you get it to the right place.
          </p>
          {validContactEmail ? (
            <a
              href={`mailto:${contactEmail}`}
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <Mail aria-hidden="true" className="size-4" />
              {contactEmail}
            </a>
          ) : (
            <p className="mt-6 text-sm text-text-muted">
              Contact is not configured yet. Add{" "}
              <code className="rounded bg-background px-1.5 py-0.5 text-xs text-text">
                NEXT_PUBLIC_CONTACT_EMAIL
              </code>{" "}
              to the environment to publish the contact address.
            </p>
          )}
        </div>

        <form
          onSubmit={submitContactForm}
          className="rounded-3xl border border-border/60 bg-surface-elevated p-5 shadow-sm sm:p-7"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-text">
              Your name
              <input
                name="name"
                autoComplete="name"
                required
                maxLength={120}
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-text">
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                maxLength={254}
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>
          </div>
          <label className="mt-5 grid gap-2 text-sm font-medium text-text">
            Message
            <textarea
              name="message"
              required
              minLength={10}
              maxLength={5000}
              rows={5}
              className="resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>
          <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              data-primary-action
              disabled={!validContactEmail}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-[background-color,transform] hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send email
              <Send aria-hidden="true" className="size-4" />
            </button>
            <p
              role="status"
              aria-live="polite"
              className="max-w-md text-xs leading-5 text-text-muted"
            >
              {status ||
                (validContactEmail
                  ? "This opens your email app; the message is sent only when you choose to send it."
                  : "The form will be available once a contact address is configured.")}
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
