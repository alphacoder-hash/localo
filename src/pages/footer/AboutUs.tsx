import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutUs() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-4xl font-bold tracking-tight">About NearNow</h1>
        <p className="text-xl text-muted-foreground">Reimagining local commerce for the digital age.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Our Mission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              To empower local vendors and connect communities through seamless, technology-driven commerce. 
              We believe that every neighborhood shop deserves the tools to thrive in a digital world.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What We Do</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              NearNow is a hyperlocal marketplace that bridges the gap between traditional street vendors 
              and modern consumers. From fresh produce to daily essentials, we bring your neighborhood 
              closer to you.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Our Story</h2>
        <p className="leading-relaxed text-muted-foreground">
          Started in 2024, NearNow was born from a simple observation: while e-commerce was booming, 
          our local street vendors—the heart of Indian neighborhoods—were being left behind. We set out 
          to build a platform that respects their traditional way of doing business while giving them 
          modern superpowers like digital catalogs, location tracking for moving stalls, and direct 
          consumer connection.
        </p>
        <p className="leading-relaxed text-muted-foreground">
          Today, we serve thousands of vendors across Bengaluru, helping them digitize their operations 
          and reach more customers than ever before.
        </p>
      </div>
    </div>
  );
}
