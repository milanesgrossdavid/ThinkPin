import { AnnouncementBar } from "../../components/announcement-bar";
import { Footer } from "../../components/footer";
import { Navbar } from "../../components/navbar";

export default function MarketingLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
