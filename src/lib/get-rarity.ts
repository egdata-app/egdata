export const getRarity = (xp: number) => {
  if (xp >= 5 && xp <= 45) {
    return "bronze";
  }

  if (xp >= 50 && xp <= 95) {
    return "silver";
  }

  if (xp >= 100 && xp <= 200) {
    return "gold";
  }

  if (xp >= 250) {
    return "platinum";
  }

  return "unknown"; // for cases where XP doesn't match any interval
};
