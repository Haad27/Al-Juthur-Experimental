import Image from 'next/image';

const LogoIcon = ({ onClick, className, style, ...props }: any) => (
  <Image
    src="/assets/favicon/apple-touch-icon.png"
    alt="Quran Logo"
    width={24}
    height={24}
    onClick={onClick}
    className={`${className?.includes('size-') || className?.includes('w-') ? '' : 'w-6 h-6'} ${className || ''}`}
    style={{ objectFit: 'contain', ...style }}
    {...props}
  />
);

export default LogoIcon;
