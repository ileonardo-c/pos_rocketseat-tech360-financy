type PageHeadingProps = {
  title: string;
  description: string;
  className?: string;
};

export const PageHeading = ({ title, description, className }: PageHeadingProps) => {
  return (
    <div className={className}>
      <h1 className="sg-page-title">{title}</h1>
      <p className="sg-page-subtitle">{description}</p>
    </div>
  );
};
