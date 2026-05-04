import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const db = await mysql.createConnection(process.env.DATABASE_URL);

// Listar todos os usuários CRM
const [users] = await db.execute("SELECT id, name, email, role, active FROM crm_users");
console.log("\n=== Usuários CRM cadastrados ===");
console.table(users);

// Promover sams2312@gmail.com para admin
const targetEmail = "sams2312@gmail.com";
const [result] = await db.execute(
  "UPDATE crm_users SET role = 'admin' WHERE email = ?",
  [targetEmail]
);

if (result.affectedRows > 0) {
  console.log(`\n✅ Usuário ${targetEmail} promovido para ADMIN com sucesso!`);
} else {
  console.log(`\n⚠️  Usuário ${targetEmail} não encontrado. Criando...`);
  
  // Criar o usuário admin se não existir
  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.default.hash("Sams@2312@.", 10);
  await db.execute(
    "INSERT INTO crm_users (name, email, password, role, active) VALUES (?, ?, ?, 'admin', 1)",
    ["Administrador SAMS", targetEmail, hash]
  );
  console.log(`✅ Usuário ${targetEmail} criado como ADMIN!`);
}

// Verificar resultado final
const [updated] = await db.execute("SELECT id, name, email, role, active FROM crm_users");
console.log("\n=== Estado final dos usuários ===");
console.table(updated);

await db.end();
