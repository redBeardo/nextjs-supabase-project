export default function PowerPointTestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-full">
      {children}
    </div>
  );
} 