import userData from "./user.json"

export const mockData = {
  user: userData,
}

export type MockData = typeof mockData
export type UserData = typeof userData