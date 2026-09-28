// <slug>: <що змінюється> (<AC / ADR>).
// Поза транзакцією раннера: CREATE INDEX CONCURRENTLY або батчевий backfill з COMMIT між батчами.
// Один оператор на файл — якщо він впаде посередині, раннер нічого сам не відкотить.
// CommonJS: у package.json немає "type": "module", і раннер вантажить .js через import().

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.noTransaction();
  pgm.sql('CREATE INDEX CONCURRENTLY IF NOT EXISTS <idx_name> ON <table> (<columns>);');
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.noTransaction();
  pgm.sql('DROP INDEX CONCURRENTLY IF EXISTS <idx_name>;');
};
