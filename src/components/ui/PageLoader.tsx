type PageLoaderProps = {
  title?: string;
  description?: string;
};

export default function PageLoader({
  title = "Loading",
  description = "Preparing your workspace...",
}: PageLoaderProps) {
  return (
    <div className="page-loader">
      <div className="loader-card">
        <div className="loader-shimmer" />
        <div className="loader-lines">
          <div className="loader-line loader-line-lg" />
          <div className="loader-line" />
          <div className="loader-line loader-line-sm" />
        </div>
        <p className="loader-title">{title}</p>
        <p className="loader-description">{description}</p>
      </div>
    </div>
  );
}
