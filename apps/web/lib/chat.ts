import { type DB, eq, schema } from '@app/db'

/** A chat room by id, or `null` when there's no such room. */
export async function getChatRoom(args: {
  db: DB
  roomId: string
}): Promise<{ id: string; name: string } | null> {
  const [room] = await args.db
    .select({ id: schema.chatRoom.id, name: schema.chatRoom.name })
    .from(schema.chatRoom)
    .where(eq(schema.chatRoom.id, args.roomId))
    .limit(1)
  return room ?? null
}
