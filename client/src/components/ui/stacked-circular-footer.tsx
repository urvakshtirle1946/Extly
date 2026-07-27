import { Icons } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.891h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
  </svg>
)

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
  </svg>
)

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
)

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.72a1.63 1.63 0 1 0 0 3.26 1.63 1.63 0 0 0 0-3.26z" />
  </svg>
)

function StackedCircularFooter() {
  return (
    <footer className="bg-black/90 border-t border-white/10 py-16 relative z-10">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center">
          <div className="mb-8 rounded-full bg-white/[0.06] border border-white/[0.12] p-6 shadow-2xl flex items-center justify-center">
            <Icons.logo className="w-8 h-8 text-white" />
          </div>
          <nav className="mb-8 flex flex-wrap justify-center gap-6">
            <a href="#" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Home</a>
            <a href="#how-it-works" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">How it Works</a>
            <a href="#pricing" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">FAQ</a>
            <a href="mailto:support@promptex.io" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Contact</a>
          </nav>
          <div className="mb-8 flex space-x-4">
            <Button variant="outline" size="icon" className="rounded-full border-white/15 bg-white/5 hover:bg-white/10 text-white transition-all">
              <FacebookIcon className="h-4 w-4 fill-current" />
              <span className="sr-only">Facebook</span>
            </Button>
            <Button variant="outline" size="icon" className="rounded-full border-white/15 bg-white/5 hover:bg-white/10 text-white transition-all">
              <TwitterIcon className="h-4 w-4 fill-current" />
              <span className="sr-only">Twitter</span>
            </Button>
            <Button variant="outline" size="icon" className="rounded-full border-white/15 bg-white/5 hover:bg-white/10 text-white transition-all">
              <InstagramIcon className="h-4 w-4 stroke-current" />
              <span className="sr-only">Instagram</span>
            </Button>
            <Button variant="outline" size="icon" className="rounded-full border-white/15 bg-white/5 hover:bg-white/10 text-white transition-all">
              <LinkedinIcon className="h-4 w-4 fill-current" />
              <span className="sr-only">LinkedIn</span>
            </Button>
          </div>
          <div className="mb-8 w-full max-w-md">
            <form className="flex space-x-2" onSubmit={(e) => e.preventDefault()}>
              <div className="flex-grow">
                <Label htmlFor="email" className="sr-only">Email</Label>
                <Input 
                  id="email" 
                  placeholder="Enter your email" 
                  type="email" 
                  className="rounded-full bg-white/[0.05] border-white/[0.12] text-white placeholder:text-neutral-500 focus-visible:ring-purple-500" 
                />
              </div>
              <Button type="submit" className="rounded-full bg-white hover:bg-neutral-200 text-black font-semibold px-6 transition-all">
                Subscribe
              </Button>
            </form>
          </div>
          <div className="text-center space-y-2">
            <div className="flex justify-center gap-4 text-xs text-neutral-400 mb-2">
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <span>•</span>
              <a href="/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</a>
            </div>
            <p className="text-xs text-neutral-500 font-medium">
              © {new Date().getFullYear()} Promptex Inc. All rights reserved.
            </p>
            <p className="text-xs text-neutral-400 pt-2">
              Made with ❤️ by{' '}
              <a
                href="https://www.linkedin.com/in/urvaksh-tirle-772601297/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-white hover:underline transition-all"
              >
                Urvaksh
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export { StackedCircularFooter }

