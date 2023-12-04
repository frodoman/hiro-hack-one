(define-constant DEPLOYER tx-sender)
(define-constant DEPLOYER_CONTRACT (as-contract tx-sender))

;; Errors 
(define-constant ERR_IVALID_AMOUNT (err u0))
(define-constant ERR_EMPTY_SUPPLY_OR_NOT_CONTRACT_OWNER (err u1))
(define-constant ERR_TRANSFER_FAILED (err u2))
(define-constant ERR_NOT_ENOUGTH_BALANCE (err u3))
(define-constant ERR_NOT_CONTRACT_OWNER (err u4))

;; Storage
(define-map keysBalance { subject: principal, holder: principal } uint)
(define-map keysSupply { subject: principal } uint)


;; -----------------------
;; Read only functions
;; -----------------------
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

(define-read-only (is-keyholder (subject principal) (holder principal))
    (>= (default-to u0 (map-get? keysBalance { subject: subject, holder: holder })) u1)
)

(define-read-only (get-keys-balance (subject principal) (holder principal))
    ;;Return the keysBalance for the given subject and holder
    (map-get? keysBalance { subject: subject, holder: holder })
)

(define-read-only (get-keys-supply (subject principal))
    ;; Return the keysSupply for the given subject
    (map-get? keysSupply {subject: subject })
)

(define-read-only (get-buy-price (subject principal) (amount uint))
  ;; Implement buy price logic
  (let  
    (
        (supply (default-to u0 (get-keys-supply subject)))
    )
    (get-price supply amount)
  )
)

(define-read-only (get-sell-price (subject principal) (amount uint))
  ;; Implement sell price logic
  (let 
    (
      (balance (default-to u0 (get-keys-balance subject tx-sender)))
      (supply (default-to u0 (get-keys-supply subject)))
    )
    (get-price (- supply amount) amount)
  )
)

;; -----------------------
;; Public functions
;; -----------------------

;; buy keys from a subject (a user)
(define-public (buy-keys (subject principal) (amount uint))
  (let
    (
      (supply (default-to u0 (get-keys-supply subject)))
      (price (get-price supply amount))
    )
    (asserts! (> amount u0) ERR_IVALID_AMOUNT)
    (asserts! (or (> supply u0) (is-eq tx-sender subject)) ERR_EMPTY_SUPPLY_OR_NOT_CONTRACT_OWNER)

    ;; transfer fees 
    ;;(try! (stx-transfer? protocolFeePercent tx-sender protocolFeeDestination))

    ;; transfer STX to contract 
    (try! (stx-transfer? price tx-sender (as-contract tx-sender)))
    (map-set keysBalance { subject: subject, holder: tx-sender }
        (+ (default-to u0 (get-keys-balance subject tx-sender)) amount)
    )
    (map-set keysSupply { subject: subject } (+ supply amount))
    (ok true)
  )
)

;; Sell keys to a subject (a user)
;; Sell owned keys to another uer ?
(define-public (sell-keys (subject principal) (amount uint))
  (let
    (
      (balance (default-to u0 (get-keys-balance subject tx-sender)))
      (supply (default-to u0 (get-keys-supply subject)))
      ;;(price (get-sell-price (- supply amount) amount))
      (price (get-sell-price subject amount))
      (recipient tx-sender)
    )
    ;; must have enough balance 
    (asserts! (>= balance amount) ERR_NOT_ENOUGTH_BALANCE)
    (asserts! (or (> supply u0) (is-eq tx-sender subject)) ERR_EMPTY_SUPPLY_OR_NOT_CONTRACT_OWNER)

    ;; transfer fees 
    ;;(try! (stx-transfer? protocolFeePercent tx-sender protocolFeeDestination))

    (try! (as-contract (stx-transfer? price tx-sender recipient)))
 
    (map-set keysBalance { subject: subject, holder: tx-sender } (- balance amount))
    (map-set keysSupply { subject: subject } (- supply amount))
    (ok true)
  )
)

;;(define-public (set-protocol-fee-percent (feePercent uint))
  ;; Check if the caller is the contractOwner
  ;;(asserts! (is-eq tx-sender DEPLOYER) ERR_NOT_CONTRACT_OWNER)

  ;; Update the protocolFeePercent value
  ;;(var-set protocolFeePercent feePercent)
;;)