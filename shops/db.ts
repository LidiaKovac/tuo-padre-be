interface Data {
  findById(id: string): Data;
  findAll(): Data[];
  findByName(name: string): Data[];
  findByIdAndEdit(id: string, body: Partial<Data>): Data;
  findByIdAndRemove(id: string): void;
}
