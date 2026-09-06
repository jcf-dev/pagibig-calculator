import { Mail, Send } from "lucide-react";
import { UpworkIcon } from "@/components/icons/upwork-icon";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/40 bg-background/45 backdrop-blur-xl">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-[clamp(1.25rem,4vw,2rem)] py-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>End-to-end software engineering from the Philippines, available worldwide.</p>
          <p>
            © {new Date().getFullYear()} Joween Flores ·{" "}
            <a
              href="/privacy-policy"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              Privacy policy
            </a>
          </p>
        </div>

        <div className="flex flex-wrap gap-1 lg:justify-end">
          <FooterIcon href="mailto:hello@joween.dev" label="Email">
            <Mail className="h-4 w-4" aria-hidden="true" />
          </FooterIcon>
          <FooterIcon href="https://www.linkedin.com/in/joweenflores/" label="LinkedIn">
            <LinkedInIcon className="h-4 w-4" />
          </FooterIcon>
          <FooterIcon href="https://github.com/jcf-dev" label="GitHub">
            <GitHubIcon className="h-4 w-4" />
          </FooterIcon>
          <FooterIcon href="https://www.upwork.com/freelancers/jcfdev" label="Upwork">
            <UpworkIcon className="h-4 w-4" />
          </FooterIcon>
          <FooterIcon href="https://wa.me/639944860433" label="WhatsApp">
            <WhatsAppIcon className="h-4 w-4" aria-hidden="true" />
          </FooterIcon>
          <FooterIcon href="https://t.me/jcfdev" label="Telegram">
            <Send className="h-4 w-4" aria-hidden="true" />
          </FooterIcon>
        </div>
      </div>
    </footer>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.447-2.136 2.942v5.664H9.351V9h3.414v1.561h.047c.476-.9 1.637-1.85 3.37-1.85 3.602 0 4.267 2.371 4.267 5.455v6.286ZM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125ZM7.119 20.452H3.554V9h3.565v11.452ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.226.792 24 1.771 24h20.451C23.2 24 24 23.226 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003Z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .297C5.37.297 0 5.67 0 12.297c0 5.304 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.725-4.033-1.416-4.033-1.416-.546-1.387-1.334-1.756-1.334-1.756-1.089-.745.084-.729.084-.729 1.205.084 1.839 1.236 1.839 1.236 1.071 1.835 2.809 1.305 3.495.998.108-.776.419-1.305.762-1.604-2.665-.303-5.466-1.333-5.466-5.93 0-1.31.468-2.381 1.235-3.222-.123-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23A11.49 11.49 0 0 1 12 6.101c1.019.005 2.045.138 3.003.404 2.292-1.552 3.298-1.23 3.298-1.23.653 1.653.242 2.873.119 3.176.77.841 1.233 1.912 1.233 3.222 0 4.609-2.806 5.624-5.479 5.921.43.371.826 1.102.826 2.222v3.291c0 .319.192.694.801.576C20.566 22.093 24 17.599 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function FooterIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={label}
    >
      {children}
    </a>
  );
}
