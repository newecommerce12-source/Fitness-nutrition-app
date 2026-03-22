import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connecté'))
  .catch(err => console.log(err));

const Meal = mongoose.model('Meal', {
  name: String,
  calories: Number,
  protein: Number,
  date: { type: Date, default: Date.now },
});

const Weight = mongoose.model('Weight', {
  weight: Number,
  notes: String,
  date: { type: Date, default: Date.now },
});

app.get('/api/stats/daily', (req, res) => {
  res.json({
    total_calories: 0,
    total_protein: 0,
    meals_count: 0,
    workouts_count: 0,
    date: new Date(),
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
