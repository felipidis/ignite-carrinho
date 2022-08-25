import { createContext, ReactNode, useContext, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '../services/api'
import { Product, Stock } from '../types'

interface CartProviderProps {
  children: ReactNode
}

interface UpdateProductAmount {
  productId: number
  amount: number
}

interface CartContextData {
  cart: Product[]
  addProduct: (productId: number) => Promise<void>
  removeProduct: (productId: number) => void
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void
}

const CartContext = createContext<CartContextData>({} as CartContextData)

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart)
    }

    return []
  })

  const addProduct = async (productId: number) => {
    try {
      const response = await api.get(`/products/${productId}`)
      const stockResponse = await api.get(`/stock/${productId}`)

      const { data: product } = response
      const stock: Stock = stockResponse.data

      const productExists = cart.find((p) => p.id === productId)

      if (productExists) {
        if (stock.amount <= productExists.amount) {
          toast.error('Quantidade solicitada fora de estoque')
        } else {
          const newCart = cart.map((p) => {
            if (p.id === productId) {
              return { ...p, amount: p.amount + 1 }
            }
            return p
          })
          
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
          
          setCart(newCart)
        }
      } else {
        if (stock.amount > 0) {
          const newCart = [...cart , {...product, amount: 1}]
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
          setCart(newCart)
        } else {
          toast.error('Quantidade solicitada fora de estoque')
        }
      }
    } catch {
      toast.error('Erro na adição do produto')
    }
  }

  const removeProduct = (productId: number) => {
    try {
      if(!cart.find(p => p.id === productId )){  
        toast.error('Erro na remoção do produto')
        return
      }
      const newCart = cart.filter((p) => p.id !== productId)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      setCart(newCart)
    } catch {
      toast.error('Erro na remoção do produto')
    }
  }

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const response = await api.get(`/stock/${productId}`)

      const stock: Stock = response.data

      if (amount < 1) {
        return
      }

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque')
      } else {
        const newCart = cart.map((p) => {
          if (p.id === productId) {
            return { ...p, amount }
          }
          return p
        })
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))

        setCart(newCart)
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextData {
  const context = useContext(CartContext)

  return context
}
