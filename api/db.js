import { readFileSync } from "fs";
import { Logger } from "../shops/logger.js";

export class Database {
  data = [];
  constructor() {
    const file = readFileSync("./shops/db.json", "utf-8");
    this.data = JSON.parse(file);
  }
  findById(id) {
    Logger.error("METHOD NOT IMPLEMENTED");
  }
  findAll(page = 1, size = 20) {
    page = parseInt(page)
    const start = size * (page - 1);
    const data = this.data.slice(start, start + size)
    return {
      count: this.data.length,
      next: data.length > 0 ? `${process.env.URL}products?page=${page + 1}` : null,
      prev: page > 1 ? `${process.env.URL}products?page=${page - 1}` : null,
      data
    };
  }
  findByName(name) {
    return this.data.filter((prod) =>
      prod.prodName.toLowerCase().includes(name.toLowerCase())
    );
  }
  findByIdAndEdit(id, body) {
    Logger.error("METHOD NOT IMPLEMENTED");
  }
  findByIdAndRemove(id) {
    Logger.error("METHOD NOT IMPLEMENTED");
  }
}
