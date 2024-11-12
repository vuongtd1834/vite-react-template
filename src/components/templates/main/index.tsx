export default function MainTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div>
      This is main Template
      <hr />
      {children}
    </div>
  );
}
