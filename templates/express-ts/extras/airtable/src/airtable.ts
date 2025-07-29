import Airtable from "airtable"


const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID!
);

export async function fetchRecords(tableName: string) {
  const records: any[] = [];

  return new Promise((resolve, reject) => {
    base(tableName)
      .select()
      .eachPage(
        (fetchedRecords, fetchNextPage) => {
          records.push(...fetchedRecords);
          fetchNextPage();
        },
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(records);
          }
        }
      );
  });
}