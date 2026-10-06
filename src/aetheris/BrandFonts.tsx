import React from 'react';

/**
 * Mount once in the document head to load the Aetheris Intros brand
 * typefaces (Cormorant Garamond, Libre Baskerville, Inter, Space Grotesk).
 * Without it, consumers fall back to system fonts because the brand
 * stylesheet only references the families by name.
 */
export const BrandFonts: React.FC = () => (
  <>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link
      href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </>
);

export default BrandFonts;
