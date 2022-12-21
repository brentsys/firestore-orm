import { FieldValue } from '../../types/firestore';
import { ModelType } from '../../types/model.types';
import { faker } from '@faker-js/faker'
import Firebase from 'firebase/compat/app'

export interface Note extends ModelType {
  title: string;
  body: string;
  createdAt: FieldValue
}

export const makeNote: () => Note = () => {
  return {
    title: faker.lorem.lines(1),
    body: faker.lorem.paragraph(),
    createdAt: Firebase.firestore.FieldValue.serverTimestamp()
  }
}