/* global use, db */
// MongoDB Playground
// To disable this template go to Settings | MongoDB | Use Default Template For Playground.
// Make sure you are connected to enable completions and to be able to run a playground.
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.
// The result of the last command run in a playground is shown on the results panel.
// By default the first 20 documents will be returned with a cursor.
// Use 'console.log()' to print to the debug output.
// For more documentation on playgrounds please refer to
// https://www.mongodb.com/docs/mongodb-vscode/playgrounds/

// Select the database to use.
use('ecommerce-nextjs');

db.getCollection('carts').insertMany([
  { userId: '1', cartIds: ['123', '234'] },
  { userId: '2', cartIds: ['345', '456'] },
]);

// Insert a few documents into the sales collection.
// db.getCollection('products').insertMany([{
//   id: '123',
//   name: 'Hat',
//   imageUrl: 'hat.jpg',
//   description: 'Cheer the team on in style with our unstructured, low crown, six-panel baseball cap made of 100% organic cotton twill. Featuring our original Big Star Collectibles artwork, screen-printed with PVC- and phthalate-free inks. Complete with matching sewn ventilation eyelets, and adjustable fabric closure.',
//   price: 29,
// }, {
//   id: '234',
//   name: 'Mug',
//   imageUrl: 'mug.jpg',
//   description: 'Enjoy your morning coffee or tea in the company of your favorite Big Star Collectible character. Our strong ceramic mug, with its comfortable D-shaped handle, is microwave and dishwasher safe, and available in one size: 11 oz (3.2” diameter x 3.8” h).',
//   price: 16,
// }, {
//     id: '345',
//   name: 'Shirt',
//   imageUrl: 'shirt.jpg',
//   description: 'Our t-shirts are made from ring-spun, long-staple organic cotton that\'s ethically sourced from member farms of local organic cotton cooperatives. Original artwork is screen-printed using PVC- and phthalate-free inks. Features crew-neck styling, shoulder-to-shoulder taping, and a buttery soft feel. Machine-wash warm, tumble-dry low.',
//   price: 26,
// }, {
//   id: '456',
//   name: 'Apron',
//   imageUrl: 'apron.jpg',
//   description: 'Everyone’s a chef in our eco-friendly apron made from 55% organic cotton and 45% recycled polyester. Showcasing your favorite Big Star Collectibles design, the apron is screen-printed in PVC- and phthalate-free inks. Apron measures 24 inches wide by 30 inches long and is easily adjustable around the neck and waist with one continuous strap. Machine-wash warm, tumble-dry low.',
//   price: 24,
// }]);

// Print a message to the output window.
console.log(db.getCollection('carts').find({}));
