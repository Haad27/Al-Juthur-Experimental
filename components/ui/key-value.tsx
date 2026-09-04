type KeyValueProps = {
  label: string;
  value: React.ReactNode;
};

export const KeyValue = ({ label, value }: KeyValueProps) => (
  <div className="flex-between">
    <span className="font-medium">{label}:</span>&nbsp;
    <span className="text-accent">{value}</span>
  </div>
);
