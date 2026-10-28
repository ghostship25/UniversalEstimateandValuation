# 04. Functional Requirements

## 1. Resource Master Management
- Support 4 major resource categories: **Material**, **Labor**, **Equipment**, **Transport**.
- Store English Name, Standard Unit, Category, Default Zone Rate, Aliases, and Source Department.
- Flexible conversion factors (e.g. 1 Bag Cement = 50 kg = 0.035 m³).

## 2. Rate Analysis Engine (Norms Computation)
- **Mathematical Model**:
  $$\text{Resource Cost} = \sum (\text{Quantity per Unit} \times \text{Resource Rate})$$
  $$\text{Subtotal Rate (A)} = \text{Material Cost} + \text{Labor Cost} + \text{Equipment Cost}$$
  $$\text{Contractor Profit \& Overhead (B)} = \text{Subtotal (A)} \times 15\%$$
  $$\text{Total Item Rate (A + B)} = \text{Subtotal (A)} + \text{Overhead (B)}$$
  $$\text{Total Rate with Tax} = \text{Total Item Rate} \times 1.13$$
- Support for nested norms (a norm consuming another sub-norm item).
- Support for Lead, Lift, and Royalty tax parameters per material.

## 3. Project BOQ & Abstract Engine
- Organize project into structural WBS chapters (e.g., Earthwork, Concrete Work, Masonry, Finishing, Services).
- Dynamic line item lookup, quantity entry, and automatic total project cost calculation.

## 4. Intelligent Data Normalization
- Identify duplicates based on fuzzy string matching (Levenshtein distance & Jaccard index).
- Detect any language translation equivalents and unit inconsistencies.

## 5. Valuation Measurement Book (Valuation MB) & Abstract Engine
- **Multi-IPC Valuation Support**: Create interim payment certificates (IPC 1, IPC 2, First & Final MBs).
- **Itemized Provisional Sum (P.S.) Items**: Dedicated `+ P.S. Item` button to add itemized provisional sums directly to valuation MBs before contingency.
- **Valuation Abstract Financial Model**:
 $$\text{Sub Total Amount} = \sum (\text{Cumulative Quantity} \times \text{Unit Rate}) + \text{P.S. Items}$$
 $$\text{Authority Grant Share} = \text{Sub Total Amount} \times \left(\frac{\text{Approved Budget}}{\text{Grand Estimate Amount}}\right)$$
 $$\text{Contingency Deduction} = \text{Authority Grant Share} \times \text{Contingency \%}$$
 $$\text{Public Participation} = \text{Sub Total Amount} - \text{Authority Grant Share}$$
 $$\text{Previous Paid Installment} = \text{Deducted for IPC > 1}$$
 $$\text{Net Authority Payable} = \text{Authority Grant Share} - \text{Contingency Deduction} - \text{Previous Paid Installment}$$
- **PDF Print & Text Wrapping**: Automated smart table printing with dynamic text wrapping and auto-sized column widths.
