// Shared face header — one purpose per section, display type for title.

export default function FaceIntro({
  face,
  title,
  blurb,
}: {
  face: "PAST" | "DECIDE" | "AHEAD";
  title: string;
  blurb: string;
}) {
  return (
    <header className="rise-in pb-1">
      <p className="face-kicker">{face}</p>
      <h1 className="display mt-2 text-2xl sm:text-3xl">{title}</h1>
      <p className="muted mt-2 max-w-2xl text-sm sm:text-base leading-relaxed">{blurb}</p>
    </header>
  );
}
