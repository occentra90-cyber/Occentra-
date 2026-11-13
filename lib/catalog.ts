export type Category = 'cv' | 'baby' | 'wedding' | 'birthday';
export type Design = { id: string; category: Category; name: string; accent: string; layout?: string; collection?: string };

export const groups: [Category, string, string][] = [
  ['cv', 'Editable CVs', 'All templates R20'],
  ['baby', 'Baby Shower', 'Stationary R49 · Living 3D R99'],
  ['wedding', 'Weddings', 'Approved wedding collections · Stationary R79'],
  ['birthday', 'Birthdays', 'Stationary R49 · Animated R99'],
];

const names: Record<Category, string[]> = {
  cv: [
    'A1 – Basic (Simple)',
    'A2 – Basic (Classic)',
    'B1 – Student (Modern)',
    'B2 – Student (Clean)',
    'C1 – Professional (Standard)',
    'C2 – Professional (Minimal)',
  ],
  baby: [
    'Little Explorer', 'Sailboat Adventure', 'Starry Night', 'Construction Fun', 'Sports All-Star',
    'Dino Friend', 'Floral Elegance', 'Princess Castle', 'Butterfly Garden', 'Sweet Dreams',
    'Classic Carriage', 'Ballerina Dreams', 'Woodland Friends', 'Hot Air Balloon', 'Baby Mobile',
    'Rainbow Bliss', 'Safari Friends', 'Boho Rainbow',
  ],
  wedding: [
    'W1A – Classic Elegance I',
    'W1B – Classic Elegance II',
    'W1C – Classic Elegance III',
    'W2A – Botanical Green I',
    'W2B – Botanical Green II',
    'W2C – Botanical Green III',
    'W3A – Floral Romance I',
    'W3B – Floral Romance II',
    'W3C – Floral Romance III',
    'W5A – Modern Minimalist I',
    'W5B – Modern Minimalist II',
    'W5C – Modern Minimalist III',
    'Art Deco Gold & Lilies',
    'Peacock Elegance',
    'Floral Arch Romance',
    'Red & Gold Celebration',
    'Royal Indian Pavilion',
    'Rustic Lanterns',
    'Winter Wonderland',
    'Tropical Sunset',
    'Celestial Night',
    'Vintage Travel',
    'Gothic Rose Chapel',
    'Enchanted Woodland',
    'King Protea',
    'Pink Lotus',
    'Heliconia',
    'Spotted Orchids',
    'White Frangipani',
    'Pink Ginger Lily',
    'Passionflower',
    'Calla Lilies',
    'Blue Hydrangeas',
    'Tropical Hibiscus',
    'Bird of Paradise',
    'Purple Orchids',
  ],
  birthday: [
    'Space', 'Firefighter', 'Robot', 'Sports', 'Racing Cars', 'Dinosaur', 'Construction', 'Pirate',
    'Superhero', 'Underwater', 'Safari', 'Camping', 'Gaming', 'Basketball', 'Skateboarding', 'Football',
    'Outdoor Adventure', 'Electric Guitar', 'Movie Night', 'Fishing', 'Music & Chill',
    'Photography & Memories', 'Fashion & Glam', 'Music Star', 'Creative Artist', 'Cozy Book Lover',
    'Paris Adventure', 'Stargazing', 'Fitness & Lifestyle', 'Baking Party', 'Floral Elegance',
    'Disco & Sparkle', 'Classic Navy', 'Tailored Stripes', 'Mountains', 'Charcoal & Bronze',
    'Motorcycle', 'Golf', 'Coffee', 'Compass', 'Fitness', 'Vintage Gentleman', 'City Skyline', 'Cinema',
  ],
};

function getWeddingCollection(name: string): string {
  if (name.includes('Classic Elegance')) return 'classic';
  if (name.includes('Botanical Green')) return 'botanical';
  if (name.includes('Floral Romance')) return 'floral';
  if (name.includes('Modern Minimalist')) return 'minimal';
  if (name.includes('Peacock')) return 'peacock';
  if (['Art Deco', 'Red & Gold', 'Royal Indian', 'Rustic', 'Winter', 'Tropical Sunset', 'Celestial', 'Vintage', 'Gothic', 'Enchanted', 'Floral Arch'].some(k => name.includes(k))) return 'maximalist';
  return 'exotic';
}

export const designs: Design[] = groups.flatMap(([category]) =>
  names[category].map((name, i) => ({
    id: category + '-' + i,
    category,
    name,
    accent: ['#a8c6d9', '#dfb9c5', '#b7c7b3', '#e2c9a4'][i % 4],
    layout: category === 'cv' ? ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'][i] : undefined,
    collection: category === 'wedding' ? getWeddingCollection(name) : undefined,
  }))
);

export const price = (category: Category, living = false) =>
  category === 'cv'
    ? 20
    : category === 'baby' || category === 'birthday'
    ? living
      ? 99
      : 49
    : category === 'wedding'
    ? 79
    : 49;
