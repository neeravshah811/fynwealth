
"use client";

import { Currency } from "./store";

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];

export const SYSTEM_CATEGORIES: Record<string, string[]> = {
  "Essentials": [
    "Rent / Housing",
    "Electricity",
    "Water bill",
    "Gas / LPG",
    "Internet / WiFi",
    "Mobile Recharge / Bill",
    "Maintenance / Society Charges"
  ],
  "Transportation": [
    "Fuel",
    "Public Transport",
    "Taxi / Ride-sharing",
    "Vehicle EMI",
    "Vehicle Maintenance"
  ],
  "Financial Commit": [
    "Loans / EMI",
    "Credit Card Bills",
    "Insurance Premiums",
    "Bank Charges",
    "Tax Payments"
  ],
  "Subscriptions": [
    "OTT",
    "Music",
    "Apps / Tools",
    "Newspapers / Magazines"
  ],
  "Food & Groceries": [
    "Groceries",
    "Dining Out",
    "Snacks & Beverages"
  ],
  "Shopping": [
    "Clothing",
    "Electronics",
    "House Items",
    "Personal Care",
    "Other"
  ],
  "Warranties": [
    "Electronics",
    "Vehicles",
    "Furniture",
    "Personal Gadgets",
    "Services & Repairs",
    "Others"
  ],
  "Health & Personal": [
    "Medicines",
    "Doctor",
    "Hospital",
    "Fitness",
    "Gym",
    "Self-care"
  ],
  "Education / Kids": [
    "School Fees",
    "Tuition",
    "Books",
    "Stationery Supplies",
    "Child Expenses"
  ],
  "Life & Entertainment": [
    "Movies",
    "Events",
    "Travel & Trips",
    "Hobbies",
    "Gifts"
  ],
  "Investments": [
    "SIP / Mutual Funds",
    "Recurring Deposit",
    "Fixed Deposit",
    "Stocks & Trading",
    "Crypto"
  ],
  "Household & Family": [
    "Repairs",
    "House Help / Maid",
    "Laundry",
    "Pet Care"
  ],
  "Miscellaneous": [
    "Charity / Donation",
    "Unexpected Expenses",
    "Others"
  ]
};
