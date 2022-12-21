import '../fixtures/repositories/firebase'
import { NoteRepository } from '../fixtures/repositories/note.repository'
import debug from "debug"
import { makeNote } from '../fixtures/models/note';

const dLog = debug("test:test:note-repository")

const repo = new NoteRepository()

describe('Note Repository', () => {

  it("should save note", async () => {
    const record = makeNote()
    const note = await repo.save(record)
    dLog("note =>", note)
    expect(note).toHaveProperty("createdAt")
  })
})

