interface BookerProductivity {
  totalBooked: number;
  totalCheckin: number;
  displayName: string;
  staffId: number;
}

export const compareBookerProductivity = (a: BookerProductivity, b: BookerProductivity): number => {
  return (
    b.totalBooked - a.totalBooked ||
    b.totalCheckin - a.totalCheckin ||
    a.displayName.localeCompare(b.displayName, 'vi') ||
    a.staffId - b.staffId
  );
};
