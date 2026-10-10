import { AnnouncementBar } from "../../components/announcement-bar";
import { Footer } from "../../components/footer";
import { Navbar } from "../../components/navbar";
import { ScrollRevealObserver } from "../../components/scroll-reveal-observer";

export default function MarketingLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <Navbar />
      <ScrollRevealObserver />
      {children}
      <Footer />
    </div>
  );
}
