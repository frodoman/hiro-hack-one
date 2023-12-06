(define-constant DEPLOYER tx-sender)
(define-constant DEPLOYER_CONTRACT (as-contract tx-sender))

;; Errors 
(define-constant ERR_IVALID_AMOUNT (err u0))
(define-constant ERR_EMPTY_SUPPLY_OR_NOT_CONTRACT_OWNER (err u1))
(define-constant ERR_TRANSFER_FAILED (err u2))
(define-constant ERR_NOT_ENOUGTH_BALANCE (err u3))
(define-constant ERR_NOT_CONTRACT_OWNER (err u4))
(define-constant ERR_INVALID_FEE  (err u5))

;; Maps
(define-map keysBalance { subject: principal, holder: principal } uint)
(define-map keysSupply { subject: principal } uint)

;; Vars
(define-data-var protocolFeePercent uint u200)
(define-data-var protocolFeeDestination principal tx-sender)

;; -----------------------
;; Read only functions
;; -----------------------

;; calculate a price based on the supply and amount required
(define-read-only (get-price (supply uint) (amount uint))
  (let
    (
      (base-price u10)
      (price-change-factor u100)
      (adjusted-supply (+ supply amount))
    )
    (+ base-price (* amount (/ (* adjusted-supply adjusted-supply) price-change-factor)))
  )
)

;; check if a holder has any keys against a subject 
(define-read-only (is-keyholder (subject principal) (holder principal))
    (>= (default-to u0 (map-get? keysBalance { subject: subject, holder: holder })) u1)
)

;; return key balance of a holder for a subject
(define-read-only (get-keys-balance (subject principal) (holder principal))
    ;;Return the keysBalance for the given subject and holder
    (default-to u0  (map-get? keysBalance { subject: subject, holder: holder }))
)

;; return the current key supply of the subject 
(define-read-only (get-keys-supply (subject principal))
    ;; Return the keysSupply for the given subject
    (default-to u0 (map-get? keysSupply {subject: subject }))
)

;; calculate the buy price for a subject and key amount
(define-read-only (get-buy-price (subject principal) (amount uint))
  ;; Implement buy price logic
  (let  
    (
        (supply (get-keys-supply subject))
    )
    (get-price supply amount)
  )
)

;; calculate the sell price for a subject and key amount 
(define-read-only (get-sell-price (subject principal) (amount uint))
  ;; Implement sell price logic
  (let 
    (
      (balance (get-keys-balance subject tx-sender))
      (supply (get-keys-supply subject))
    )
    (get-price (- supply amount) amount)
  )
)

;; return protocol fees
(define-read-only (get-protocol-fee-percent)
  (var-get protocolFeePercent)
)

;; -----------------------
;; Public functions
;; -----------------------

;; update protocol fees 
(define-public (set-protocol-fee-percent (feePercent uint))
  (begin  
    (asserts! (> feePercent u0) ERR_INVALID_FEE)
    ;; Check if the caller is the contractOwner
    (asserts! (is-eq tx-sender DEPLOYER) ERR_NOT_CONTRACT_OWNER)

    ;; Update the protocolFeePercent value
    (ok (var-set protocolFeePercent feePercent))
  )
)

;; buy keys for a subject (a user) with key amount 
(define-public (buy-keys (subject principal) (amount uint))
  (let
    (
      (balance (get-keys-balance subject tx-sender))
      (supply (get-keys-supply subject))
      (price (get-price supply amount))
    )
    ;; invalid amount
    (asserts! (> amount u0) ERR_IVALID_AMOUNT)

    (asserts! (or (> supply u0) (is-eq tx-sender subject)) ERR_EMPTY_SUPPLY_OR_NOT_CONTRACT_OWNER)

    ;; transfer STX to contract 
    (try! (stx-transfer? price tx-sender (as-contract tx-sender)))

    ;; Update maps
    (map-set keysBalance { subject: subject, holder: tx-sender } (+ balance amount))
    (map-set keysSupply { subject: subject } (+ supply amount))

    ;; transfer fees 
    (transfer-fees tx-sender)
  )
)

;; Sell keys of a subject with key amount
;;
(define-public (sell-keys (subject principal) (amount uint))
  (let
    (
      (balance (get-keys-balance subject tx-sender))
      (supply (get-keys-supply subject))
      (price (get-sell-price subject amount))
      (recipient tx-sender)
    )
    ;; must have enough balance 
    (asserts! (>= balance amount) ERR_NOT_ENOUGTH_BALANCE)
    (asserts! (or (> supply u0) (is-eq tx-sender subject)) ERR_EMPTY_SUPPLY_OR_NOT_CONTRACT_OWNER)

    ;;transfer STX from contract to tx-sender 
    (try! (as-contract (stx-transfer? price tx-sender recipient)))
 
    ;; Update maps 
    (map-set keysBalance { subject: subject, holder: tx-sender } (- balance amount))
    (map-set keysSupply { subject: subject } (- supply amount))
    
    ;; transfer fees
    (transfer-fees tx-sender)
  )
)

;; -----------------------
;; Private functions
;; -----------------------

;; transfer fees to deployer
(define-private (transfer-fees (sender principal))
    ;; transfer fees 
    (if (is-eq sender DEPLOYER) 
      (ok true)
      (stx-transfer? (var-get protocolFeePercent) tx-sender (var-get protocolFeeDestination))
    )
)
