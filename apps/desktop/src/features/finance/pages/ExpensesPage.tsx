import React from 'react';
import { useParams } from 'react-router-dom';

export function ExpensesPage() {
  const { daysheetId } = useParams<{ daysheetId: string }>();

  return (
    <main data-page="expenses">
      <h1>Gastos y Viáticos</h1>
      <p>{daysheetId}</p>
    </main>
  );
}
