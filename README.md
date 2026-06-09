# Movie Draw & Guess

A multiplayer web game where one player watches a movie clip, sketches keyframes, and others guess the film.

## Setup

```bash
npm run install:all
```

## Run

```bash
npm run dev
```

- **Client:** http://localhost:5173
- **Server:** http://localhost:3001

## Game Flow

1. **Home** — Start game or share an invite link with friends
2. **Waiting Room** — Host starts when 2+ players join
3. **Role Selection** — Choose Drawer or Guesser
4. **Drawing Phase** — Drawer watches clip, picks 3 keyframes, sketches each
5. **Guessing Phase** — Guessers watch live sketches, rate drawings, guess the movie
6. **Round Results** — Scores calculated, vote to continue or exit

## Clips Folder Structure

```
clips/
  Action/
    MovieName-Clip-1/
      MovieName-Clip-1.mp4
      keyframes/
        1.jpg
        2.jpg
        ...
  Heavy Composition/
  Impressionistic/
  Long Take/
  Spatial Transformation/
```

Empty category folders show: "Game resources are being created, please stay tuned."

## Scoring

- **Drawer:** Up to 5 pts per sketch (avg rating) + 1 pt per correct guesser
- **Guesser:** 5 pts correct guess, +5 bonus for first correct
