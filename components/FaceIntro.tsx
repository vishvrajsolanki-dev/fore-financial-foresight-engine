// FORE — components/FaceIntro.tsx
// TASK-010 polish: shared face header so PAST / DECIDE / AHEAD read as one product, not three skins.

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
    <div className="card">
      <p className="face-kicker">{face}</p>
      <p className="mt-1 text-lg font-semibold">{title}</p>
      <p className="muted mt-1 text-sm">{blurb}</p>
    </div>
  );
}
