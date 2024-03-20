import { readFileSync } from "fs";
import { Logger } from "../shops/logger.js";
import path from "path";

export class Database {
  data = [];
  constructor() {
    const __dirname = import.meta.dirname
    const file = readFileSync(path.resolve(__dirname, "..", "shops", "db.json"), "utf-8");
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
  findByName(name, page = 1, size = 20) {
    page = parseInt(page)
    const start = size * (page - 1);
    // console.log(this.data)
    const found = this.data.filter((prod) =>
      prod?.prodName?.toLowerCase().includes(name.toLowerCase())
    )
    const data = found.slice(start, start + size)
    return {
      count: found.length,
      next: data.length > 0 ? `${process.env.URL}products?page=${page + 1}` : null,
      prev: page > 1 ? `${process.env.URL}products?page=${page - 1}` : null,
      data
    };
  }
  findByIdAndEdit(id, body) {
    Logger.error("METHOD NOT IMPLEMENTED");
  }
  findByIdAndRemove(id) {
    Logger.error("METHOD NOT IMPLEMENTED");
  }
}
