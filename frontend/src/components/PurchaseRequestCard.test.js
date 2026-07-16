import { render, screen } from '@testing-library/react'
import PurchaseRequestCard from './PurchaseRequestCard'

jest.mock('../hooks/usePurchaseRequests', () => ({
  usePurchaseRequests: () => ({
    updateRequest: jest.fn(),
    isLoading: false
  })
}))

describe('PurchaseRequestCard', () => {
  it('shows a details action for each request', () => {
    render(
      <PurchaseRequestCard
        request={{
          _id: 'req-1',
          referenceNo: 'NAV-PO-2026-12345',
          vendorName: 'Alpha Supplies',
          department: 'Operations',
          status: 'Pending ED Approval',
          totalAmount: 125000,
          createdAt: '2026-06-30T00:00:00.000Z',
          items: [{ itemName: 'Printer', quantity: 2, unitPrice: 50000, lineTotal: 100000 }],
          attachments: ['invoice.pdf'],
          history: []
        }}
        onUpdated={() => {}}
      />
    )

    expect(screen.getByText(/View Details/i)).toBeInTheDocument()
  })
})
