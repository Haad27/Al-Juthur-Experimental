const LogoIcon = ({ onClick, className, style, ...props }: any) => (
  <div 
    onClick={onClick} 
    className={`bg-current ${className?.includes('size-') || className?.includes('w-') ? '' : 'size-6'} ${className || ''}`} 
    style={{ 
      maskImage: 'url("/assets/favicon/quran (2).png")', 
      WebkitMaskImage: 'url("/assets/favicon/quran (2).png")', 
      maskSize: 'contain', 
      maskRepeat: 'no-repeat', 
      maskPosition: 'center',
      ...style 
    }} 
    {...props}
  />
);

export default LogoIcon;
