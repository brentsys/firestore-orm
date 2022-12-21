import { fb as db } from "../fixture_data"

export const makeCities = async () => {
  const citiesRef = db.collection('cities');

  await citiesRef.doc('SF').set({
    name: 'San Francisco', state: 'CA', country: 'USA',
    capital: false, population: 860000,
    regions: ['west_coast', 'norcal']
  });
  await citiesRef.doc('LA').set({
    name: 'Los Angeles', state: 'CA', country: 'USA',
    capital: false, population: 3900000,
    regions: ['west_coast', 'socal']
  });
  await citiesRef.doc('DC').set({
    name: 'Washington, D.C.', state: null, country: 'USA',
    capital: true, population: 680000,
    regions: ['east_coast']
  });
  await citiesRef.doc('TOK').set({
    name: 'Tokyo', state: null, country: 'Japan',
    capital: true, population: 9000000,
    regions: ['kanto', 'honshu']
  });
  await citiesRef.doc('BJ').set({
    name: 'Beijing', state: null, country: 'China',
    capital: true, population: 21500000,
    regions: ['jingjinji', 'hebei']
  });
}

export async function deleteCities() {
  const citiesRef = db.collection('cities');
  const snap = await citiesRef.get()
  const batch = db.batch()
  snap.docs.forEach(doc => batch.delete(doc.ref))
  await batch.commit()
}