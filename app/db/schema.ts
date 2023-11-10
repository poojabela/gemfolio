import { relations } from "drizzle-orm";
import {
  pgTableCreator,
  text,
  timestamp,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";

const pgTable = pgTableCreator((name) => `portfolios-${name}`);

export const portfolios = pgTable("portfolios", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),

  name: text("name").notNull(),
  url: text("url").notNull(),
  image: text("image").notNull(),

  createdAt: timestamp("createdAt", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  published: boolean("published").default(false).notNull(),
});

export const votes = pgTable("votes", {
  id: uuid("id").defaultRandom().primaryKey(),
  ip: text("ip").notNull(),
  portfolioId: uuid("portfolioId").notNull(),
});

export const portfoliosRelations = relations(portfolios, ({ many }) => {
  return {
    votes: many(votes),
  };
});

export const votesRelations = relations(votes, ({ one }) => {
  return {
    portfolio: one(portfolios, {
      fields: [votes.portfolioId],
      references: [portfolios.id],
    }),
  };
});
