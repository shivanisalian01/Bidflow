import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  
} from "@react-pdf/renderer";
const formatMoney = (amount: number) => {
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
const formatDate = (date?: string) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#1f2937",
    lineHeight: 1.5,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 20,
  },

  companySection: {
    flexDirection: "row",
    gap: 15,
    width: "60%",
  },

  logo: {
    width: 60,
    height: 60,
    objectFit: "contain",
  },

  companyName: {
  fontSize: 20,
  fontWeight: "bold",
  color: "#111827",
  marginBottom: 4,
},
companyInfo: {
  fontSize: 10,
  color: "#6B7280",
  marginBottom: 2,
},

  quotationBox: {
    alignItems: "flex-end",
  },

 quotationTitle: {
  fontSize: 22,
  fontWeight: "bold",
  color: "#111827",
  marginBottom: 4,
},

  quotationNumber: {
    color: "#6B7280",
    marginBottom: 12,
  },

  smallLabel: {
    fontSize: 9,
    color: "#9CA3AF",
    textTransform: "uppercase",
    marginTop: 4,
  },

  customerSection: {
    marginTop: 28,
    marginBottom: 28,
  },

  customerLabel: {
    fontSize: 9,
    color: "#9CA3AF",
    textTransform: "uppercase",
    marginBottom: 4,
  },

  customerName: {
    fontSize: 18,
    fontWeight: "bold",
  },

  customerCompany: {
    marginTop: 2,
    color: "#6B7280",
  },

  table: {
    marginTop: 10,
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },

  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },

  desc: {
    width: "46%",
  },

  qty: {
    width: "14%",
    textAlign: "right",
  },

  unit: {
    width: "20%",
    textAlign: "right",
  },

  amount: {
    width: "20%",
    textAlign: "right",
    fontWeight: "bold",
  },

  totalsBox: {
  width: 240,
  marginLeft: "auto",
  marginTop: 28,
  backgroundColor: "#F9FAFB",
  borderWidth: 1,
  borderColor: "#E5E7EB",
  borderRadius: 6,
  padding: 14,
},

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

 grandTotal: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  borderTopWidth: 1,
  borderTopColor: "#D1D5DB",
  paddingTop: 12,
  marginTop: 10,
  fontSize: 16,
  fontWeight: "bold",
},

  notesContainer: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 20,
  },

  notesBlock: {
    width: "46%",
  },

  notesTitle: {
    fontSize: 9,
    color: "#9CA3AF",
    textTransform: "uppercase",
    marginBottom: 6,
  },

  footer: {
    marginTop: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  signature: {
    width: 110,
    height: 50,
    objectFit: "contain",
  },

  thankYou: {
    color: "#6B7280",
    fontSize: 10,
  },
});

export default function QuotationPDF({
  business,
  customer,
  form,
  items,
  totals,
  currency,
}: any) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>

  {/* Header */}

  <View style={styles.header}>

    <View style={styles.companySection}>

      {business?.logo_url && (
        <Image
          src={business.logo_url}
          style={styles.logo}
        />
      )}

      <View>

        <Text style={styles.companyName}>
          {business?.name}
        </Text>

        {business?.address && (
          <Text style={styles.companyInfo}>
            {business.address}
          </Text>
        )}

        {business?.email && (
          <Text style={styles.companyInfo}>
            {business.email}
          </Text>
        )}

        {business?.phone && (
          <Text style={styles.companyInfo}>
            {business.phone}
          </Text>
        )}

        {business?.gst_number && (
          <Text style={styles.companyInfo}>
            GST: {business.gst_number}
          </Text>
        )}

      </View>

    </View>

    <View style={styles.quotationBox}>

      <Text style={styles.quotationTitle}>
          QUOTATION
      </Text>

      <Text style={styles.quotationNumber}>
        {form.number}
      </Text>
      <View style={{ height: 8 }} />

      <Text style={styles.smallLabel}>
        Issued
      </Text>

      <Text>{formatDate(form.issue_date)}</Text>

      {form.expiry_date && (
        <>
          <Text style={styles.smallLabel}>
            Valid Until
          </Text>

         <Text>{formatDate(form.expiry_date)}</Text>
        </>
      )}

    </View>

  </View>

  {/* Customer */}

  <View style={styles.customerSection}>

    <Text style={styles.customerLabel}>
      Prepared For
    </Text>

    <Text style={styles.customerName}>
      {customer?.name || "-"}
    </Text>

    {customer?.company && (
      <Text style={styles.customerCompany}>
        {customer.company}
      </Text>
    )}

  </View>
  {/* Items Table */}

<View style={styles.table}>

  <View style={styles.tableHeader}>

    <Text style={styles.desc}>Description</Text>

    <Text style={styles.qty}>Qty</Text>

    <Text style={styles.unit}>Unit</Text>

    <Text style={styles.amount}>Amount</Text>

  </View>

  {items.map((item: any, index: number) => (

    <View key={index} style={styles.row}>

      <Text style={styles.desc}>
        {item.description}
      </Text>

      <Text style={styles.qty}>
        {item.quantity}
      </Text>

     <Text style={styles.unit}>
  {currency} {formatMoney(Number(item.unit_price))}
</Text>

      <Text style={styles.amount}>
  {currency} {formatMoney(item.quantity * item.unit_price)}
</Text>

    </View>

  ))}

</View>
{/* Totals */}

<View style={styles.totalsBox}>

  <View style={styles.totalRow}>
    <Text>Subtotal</Text>
    <Text>{currency} {formatMoney(totals.subtotal)}</Text>
  </View>

  <View style={styles.totalRow}>
    <Text>
      Discount ({form.discount_rate}%)
    </Text>

    <Text>- {currency} {formatMoney(totals.discount_amount)}</Text>
  </View>

  <View style={styles.totalRow}>
    <Text>
      Tax ({form.tax_rate}%)
    </Text>

   <Text>{currency} {formatMoney(totals.tax_amount)}</Text>
  </View>

  <View style={styles.grandTotal}>
    <Text>Total</Text>

   <Text>{currency} {formatMoney(totals.total)}</Text>
  </View>

</View>
{/* Notes & Terms */}

{(form.notes || form.terms) && (
  <View style={styles.notesContainer}>

    {form.notes && (
      <View style={styles.notesBlock}>
        <Text style={styles.notesTitle}>Notes</Text>

        <Text>
          {form.notes}
        </Text>
      </View>
    )}

    {form.terms && (
      <View style={styles.notesBlock}>
        <Text style={styles.notesTitle}>
          Terms & Conditions
        </Text>

        <Text>
          {form.terms}
        </Text>
      </View>
    )}

  </View>
)}
{/* Footer */}

<View style={styles.footer}>

  <Text style={styles.thankYou}>
    Thank you for your business.
  </Text>

  <View>

    {business?.signature_url ? (

      <Image
        src={business.signature_url}
        style={styles.signature}
      />

    ) : (

      <Text
        style={{
          fontStyle: "italic",
          color: "#6B7280",
        }}
      >
        — {business?.name}
      </Text>

    )}

  </View>

</View>
<Text
  fixed
  render={({ pageNumber, totalPages }) =>
    `${pageNumber} / ${totalPages}`
  }
  style={{
    position: "absolute",
    bottom: 20,
    right: 40,
    fontSize: 9,
    color: "#9CA3AF",
  }}
/>
</Page>
    </Document>
  );
}