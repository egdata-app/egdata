const currenciesWithFullPrice = ["JPY", "KRW"];

const shouldCalculatePrice = (currency: string) => !currenciesWithFullPrice.includes(currency);

export function calculatePrice(price: number, currency = "USD") {
  if (shouldCalculatePrice(currency)) {
    return price / 100;
  }

  return price;
}
