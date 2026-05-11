import { graphql, type ResultOf, type VariablesOf } from "@/graphql"
import { httpClient } from "@/lib/http-client"
import { queryOptions } from "@tanstack/react-query"

const offerQuery = graphql(`
  query Offer($id: String!, $country: String!) {
    offer(id: $id) {
      id
      _id
      title
      description
      developerDisplayName
      creationDate
      effectiveDate
      isCodeRedemptionOnly
      categories
      countriesBlacklist
      countriesWhitelist
      ageRating
      customAttributes {
        _id
        key
        type
        value
      }
      features {
        launcher
        features
        epicFeatures
      }
      hltb {
        _id
        name
        main
        mainExtra
        completionist
      }
      ratings {
        _id
        overallScore
        recommendedPercentage
        totalReviews
      }
      price(country: $country) {
        country
        namespace
        region
        updatedAt
        price {
          currencyCode
          discount
          discountPrice
          originalPrice
        }
      }
    }
  }
`)

export type OfferQueryResult = ResultOf<typeof offerQuery>
export type OfferQueryVariables = VariablesOf<typeof offerQuery>

export const offerGqlQueryOptions = (variables: OfferQueryVariables) =>
  queryOptions({
    queryKey: ["offer-gql", variables],
    queryFn: () =>
      httpClient.post<{ data: OfferQueryResult }>("/graphql", {
        query: offerQuery,
        variables,
      }),
    staleTime: 60_000,
  })
